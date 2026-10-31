import { NextResponse } from 'next/server';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type YoutubeItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
  };
};

type YoutubeResponse = {
  items?: YoutubeItem[];
  error?: { message?: string; errors?: { reason?: string }[] };
};

type TrailerResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
  publishedAt: string | null;
  watchUrl: string;
  likelyOfficial: boolean;
};

function isLikelyOfficial(title: string, channel: string) {
  return /\bofficial\b/i.test(`${title} ${channel}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get('title') || '').trim().slice(0, 100);
  const yearValue = (url.searchParams.get('year') || '').trim();
  const year = /^\d{4}$/.test(yearValue) ? yearValue : '';
  if (title.length < 2) return NextResponse.json({ results: [], code: 'invalid_title' }, { status: 400 });

  const gate = await rateLimit(`imdb-trailer:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ results: [], limited: true, code: 'rate_limited' }, { status: 429 });

  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return NextResponse.json({ results: [], configured: false, code: 'missing_api_key' }, { status: 503 });

  const query = [title, year, 'official trailer'].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '6', q: query,
    videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'strict', key
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(7000), next: { revalidate: 1800 }
    });
    const data = await response.json().catch(() => ({})) as YoutubeResponse;
    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason;
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        return NextResponse.json({ results: [], configured: true, code: 'quota_exceeded' }, { status: 429 });
      }
      if (reason === 'keyInvalid' || reason === 'accessNotConfigured' || response.status === 403) {
        return NextResponse.json({ results: [], configured: true, code: 'api_unavailable' }, { status: 503 });
      }
      return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
    }

    const results: TrailerResult[] = (data.items ?? []).flatMap((item) => {
      const videoId = item.id?.videoId;
      if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return [];
      const videoTitle = item.snippet?.title ?? 'YouTube trailer';
      const channelTitle = item.snippet?.channelTitle ?? 'YouTube channel';
      return [{
        videoId,
        title: videoTitle,
        channelTitle,
        thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? null,
        publishedAt: item.snippet?.publishedAt ?? null,
        watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        likelyOfficial: isLikelyOfficial(videoTitle, channelTitle)
      }];
    });
    results.sort((a, b) => Number(b.likelyOfficial) - Number(a.likelyOfficial));

    return NextResponse.json({ results, configured: true }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' }
    });
  } catch {
    return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
  }
}
