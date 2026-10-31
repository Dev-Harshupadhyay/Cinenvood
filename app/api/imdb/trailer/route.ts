import { NextResponse } from 'next/server';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';
import { fetchTitleVideos, searchTitles, tmdbConfigured, type MediaType, type TmdbVideo } from '@/lib/tmdb';

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

function normalizeTitle(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isLikelyOfficial(title: string, channel: string) {
  return /\bofficial\b/i.test(`${title} ${channel}`);
}

async function findTmdbTrailers(title: string, year: number, mediaType: MediaType, requestedTmdbId: number | null): Promise<TrailerResult[]> {
  if (!tmdbConfigured()) return [];
  let tmdbId = requestedTmdbId;
  if (!tmdbId) {
    const results = (await searchTitles(title)).results;
    const wanted = normalizeTitle(title);
    const match = results
      .filter((item) => item.media_type === mediaType)
      .filter((item) => normalizeTitle(item.title ?? item.name ?? '') === wanted)
      .filter((item) => {
        const resultYear = Number((item.release_date ?? item.first_air_date ?? '').slice(0, 4)) || 0;
        return !year || !resultYear || Math.abs(resultYear - year) <= 1;
      })
      .sort((a, b) => {
        const yearOf = (value: typeof a) => Number((value.release_date ?? value.first_air_date ?? '').slice(0, 4)) || 0;
        return Number(yearOf(b) === year) - Number(yearOf(a) === year);
      })[0];
    tmdbId = match?.id ?? null;
  }
  if (!tmdbId) return [];

  const isPlayableCandidate = (video: TmdbVideo) =>
    video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser') && /^[A-Za-z0-9_-]{11}$/.test(video.key);
  let videos = (await fetchTitleVideos(tmdbId, mediaType, 'en-US')).filter(isPlayableCandidate);
  if (!videos.length) videos = (await fetchTitleVideos(tmdbId, mediaType, 'hi-IN')).filter(isPlayableCandidate);
  return videos
    .sort((a, b) =>
      Number(b.official) - Number(a.official) ||
      Number(b.type === 'Trailer') - Number(a.type === 'Trailer') ||
      Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en')
    )
    .slice(0, 8)
    .map((video) => ({
      videoId: video.key,
      title: video.name || `${title} ${video.type.toLowerCase()}`,
      channelTitle: video.official ? 'Official trailer listing · TMDB' : 'TMDB video listing',
      thumbnail: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
      publishedAt: video.published_at ?? null,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`,
      likelyOfficial: video.official
    }));
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
  const year = /^\d{4}$/.test(yearValue) ? Number(yearValue) : 0;
  const mediaType: MediaType = url.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie';
  const tmdbIdValue = (url.searchParams.get('tmdbId') || '').trim();
  const parsedTmdbId = /^\d+$/.test(tmdbIdValue) ? Number(tmdbIdValue) : 0;
  const tmdbId = Number.isSafeInteger(parsedTmdbId) && parsedTmdbId > 0 ? parsedTmdbId : null;
  if (title.length < 2) return NextResponse.json({ results: [], code: 'invalid_title' }, { status: 400 });

  const gate = await rateLimit(`imdb-trailer:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ results: [], limited: true, code: 'rate_limited' }, { status: 429 });

  try {
    const tmdbResults = await findTmdbTrailers(title, year, mediaType, tmdbId).catch(() => []);
    if (tmdbResults.length) {
      return NextResponse.json({ results: tmdbResults, configured: true, source: 'tmdb' }, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' }
      });
    }

    const key = process.env.YOUTUBE_API_KEY?.trim();
    if (!key) {
      return NextResponse.json({ results: [], configured: false, code: 'no_trailer_source' }, { status: 503 });
    }

    // TMDB video records are tried first; YouTube search is the broader second source.
    const precise = [title, year || '', 'official trailer'].filter(Boolean).join(' ');
    const fallback = [title, year || '', 'trailer'].filter(Boolean).join(' ');
    let result: Awaited<ReturnType<typeof searchYouTube>> | null = null;
    let parsed: TrailerResult[] = [];
    let usedFallback = false;
    try {
      result = await searchYouTube(key, precise);
      if (!result.response.ok) return searchError(result.response, result.data);
      parsed = parseResults(result.data.items ?? []);
    } catch {
      if (fallback === precise) throw new Error('YouTube search request failed');
      usedFallback = true;
    }
    if (!parsed.length && fallback !== precise) {
      result = await searchYouTube(key, fallback);
      if (!result.response.ok) return searchError(result.response, result.data);
      parsed = parseResults(result.data.items ?? []);
      usedFallback = true;
    }
    parsed.sort((a, b) => Number(b.likelyOfficial) - Number(a.likelyOfficial));

    return NextResponse.json({ results: parsed, configured: true, source: 'youtube', query: usedFallback ? fallback : precise }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' }
    });
  } catch {
    return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
  }
}
