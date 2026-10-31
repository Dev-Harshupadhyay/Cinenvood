import { NextResponse } from 'next/server';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type YoutubeItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
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

async function searchYouTube(key: string, query: string) {
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '10', q: query,
    videoEmbeddable: 'true', safeSearch: 'moderate', key
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    signal: AbortSignal.timeout(4000), next: { revalidate: 1800 },
    headers: { accept: 'application/json' }
  });
  const data = await response.json().catch(() => ({})) as YoutubeResponse;
  return { response, data };
}

function searchError(response: Response, data: YoutubeResponse) {
  const reason = data.error?.errors?.[0]?.reason;
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return NextResponse.json({ results: [], configured: true, code: 'quota_exceeded' }, { status: 429 });
  }
  if (reason === 'keyInvalid' || reason === 'accessNotConfigured' || response.status === 403) {
    return NextResponse.json({ results: [], configured: true, code: 'api_unavailable' }, { status: 503 });
  }
  return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
}

function parseResults(items: YoutubeItem[]): TrailerResult[] {
  return items.flatMap((item) => {
    const videoId = item.id?.videoId;
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return [];
    const title = item.snippet?.title ?? 'YouTube trailer';
    const channelTitle = item.snippet?.channelTitle ?? 'YouTube channel';
    return [{
      videoId,
      title,
      channelTitle,
      thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      likelyOfficial: isLikelyOfficial(title, channelTitle)
    }];
  });
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

  try {
    // Keep the first query precise, but do not require YouTube's extra syndicated flag.
    // If there are no matches, retry with a broader query (still embeddable for IFrame playback).
    const precise = [title, year, 'official trailer'].filter(Boolean).join(' ');
    const fallback = [title, year, 'trailer'].filter(Boolean).join(' ');
    let result: Awaited<ReturnType<typeof searchYouTube>> | null = null;
    let parsed: TrailerResult[] = [];
    let usedFallback = false;
    try {
      result = await searchYouTube(key, precise);
      if (!result.response.ok) return searchError(result.response, result.data);
      parsed = parseResults(result.data.items ?? []);
    } catch {
      if (fallback === precise) throw new Error('YouTube search request failed');
      // A transient failure on the narrow query should not prevent the broader retry.
      usedFallback = true;
    }
    if (!parsed.length && fallback !== precise) {
      result = await searchYouTube(key, fallback);
      if (!result.response.ok) return searchError(result.response, result.data);
      parsed = parseResults(result.data.items ?? []);
      usedFallback = true;
    }
    parsed.sort((a, b) => Number(b.likelyOfficial) - Number(a.likelyOfficial));

    return NextResponse.json({ results: parsed, configured: true, query: usedFallback ? fallback : precise }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' }
    });
  } catch {
    return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
  }
}
