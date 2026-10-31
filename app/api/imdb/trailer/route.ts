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
  language: 'en' | 'hi' | 'other';
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
  const [englishVideos, hindiVideos] = await Promise.all([
    fetchTitleVideos(tmdbId, mediaType, 'en-US'),
    fetchTitleVideos(tmdbId, mediaType, 'hi-IN')
  ]);
  const videos = [...new Map([...englishVideos, ...hindiVideos].filter(isPlayableCandidate).map((video) => [video.key, video])).values()];
  return videos
    .sort((a, b) =>
      Number(b.official) - Number(a.official) ||
      Number(b.type === 'Trailer') - Number(a.type === 'Trailer') ||
      Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en')
    )
    .slice(0, 16)
    .map((video) => ({
      videoId: video.key,
      title: video.name || `${title} ${video.type.toLowerCase()}`,
      channelTitle: video.official ? 'Official trailer listing · TMDB' : 'TMDB video listing',
      thumbnail: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
      publishedAt: video.published_at ?? null,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`,
      likelyOfficial: video.official,
      language: video.iso_639_1 === 'hi' ? 'hi' as const : video.iso_639_1 === 'en' ? 'en' as const : 'other' as const
    }));
}

async function searchYouTube(key: string, query: string, language: 'en' | 'hi') {
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '8', q: query,
    videoEmbeddable: 'true', safeSearch: 'moderate', relevanceLanguage: language,
    regionCode: language === 'hi' ? 'IN' : 'US', key
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

function parseResults(items: YoutubeItem[], language: 'en' | 'hi'): TrailerResult[] {
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
      likelyOfficial: isLikelyOfficial(title, channelTitle),
      language
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
    const key = process.env.YOUTUBE_API_KEY?.trim();
    if (!key && !tmdbResults.length) {
      return NextResponse.json({ results: [], configured: false, code: 'no_trailer_source' }, { status: 503 });
    }

    let youtubeResults: TrailerResult[] = [];
    let rejectedSearches = 0;
    const upstreamErrors: { response: Response; data: YoutubeResponse }[] = [];
    if (key) {
      const queryBase = [title, year || '', 'official trailer'].filter(Boolean).join(' ');
      const [english, hindi] = await Promise.allSettled([
        searchYouTube(key, `${queryBase} English`, 'en'),
        searchYouTube(key, `${queryBase} Hindi`, 'hi')
      ]);
      for (const [result, language] of [[english, 'en'], [hindi, 'hi']] as const) {
        if (result.status === 'rejected') {
          rejectedSearches += 1;
          continue;
        }
        if (!result.value.response.ok) {
          upstreamErrors.push({ response: result.value.response, data: result.value.data });
          continue;
        }
        youtubeResults = [...youtubeResults, ...parseResults(result.value.data.items ?? [], language)];
      }
    }

    const byVideoId = new Map<string, TrailerResult>();
    for (const item of [...tmdbResults, ...youtubeResults]) {
      const existing = byVideoId.get(item.videoId);
      if (!existing || (existing.language === 'other' && item.language !== 'other') || (!existing.likelyOfficial && item.likelyOfficial)) {
        byVideoId.set(item.videoId, item);
      }
    }
    const combined = [...byVideoId.values()]
      .filter((item) => item.language === 'en' || item.language === 'hi')
      .sort((a, b) => Number(b.likelyOfficial) - Number(a.likelyOfficial));
    const results = (['en', 'hi'] as const).flatMap((language) => combined.filter((item) => item.language === language).slice(0, 10));

    if (!results.length && upstreamErrors.length) return searchError(upstreamErrors[0].response, upstreamErrors[0].data);
    if (!results.length && rejectedSearches === 2) {
      return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
    }
    const source = tmdbResults.length && youtubeResults.length ? 'mixed' : tmdbResults.length ? 'tmdb' : 'youtube';
    return NextResponse.json({ results, configured: Boolean(key) || tmdbResults.length > 0, source }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' }
    });
  } catch {
    return NextResponse.json({ results: [], configured: true, code: 'upstream_error' }, { status: 502 });
  }
}
