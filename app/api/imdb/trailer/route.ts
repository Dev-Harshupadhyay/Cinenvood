import { NextResponse } from 'next/server';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = (url.searchParams.get('title') || '').trim().slice(0, 100);
  const year = (url.searchParams.get('year') || '').replace(/[^0-9]/g, '').slice(0, 4);
  if (title.length < 2) return NextResponse.json({ results: [] }, { status: 400 });

  const gate = await rateLimit(`imdb-trailer:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ results: [], limited: true }, { status: 429 });

  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return NextResponse.json({ results: [], configured: false }, { status: 503 });

  const query = [title, year, 'official trailer'].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '6', q: query,
    videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'strict', key
  });
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(7000), next: { revalidate: 1800 }
    });
    if (!response.ok) return NextResponse.json({ results: [], configured: true }, { status: 502 });
    const data = await response.json();
    const results = (data.items || []).flatMap((item: any) => {
      const videoId = item.id?.videoId;
      if (!videoId) return [];
      return [{
        videoId,
        title: item.snippet?.title || 'YouTube trailer',
        channelTitle: item.snippet?.channelTitle || 'YouTube channel',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || null,
        publishedAt: item.snippet?.publishedAt || null,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
      }];
    });
    return NextResponse.json({ results, configured: true }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ results: [], configured: true }, { status: 502 });
  }
}
