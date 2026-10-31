/**
 * TMDB integration — server-side, ISP-safe and optional in local demo mode.
 * TMDB_API_KEY may be a v3 key or v4 read token. The key is never sent to the browser.
 */
import { TMDB_API as BASE, TMDB_IMG as IMG, viaProxy, imgUrl } from './tmdb-proxy';

export type MediaType = 'movie' | 'tv';

export function tmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

function authHeaders(): Record<string, string> {
  const key = process.env.TMDB_API_KEY?.trim() ?? '';
  return key.length > 40 ? { Authorization: `Bearer ${key}` } : {};
}

function withKey(url: string) {
  const key = process.env.TMDB_API_KEY?.trim() ?? '';
  if (!key || key.length > 40) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(key)}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  if (!tmdbConfigured()) return null;
  const qs = new URLSearchParams(params).toString();
  const url = withKey(`${BASE}${path}${qs ? `?${qs}` : ''}`);
  try {
    const res = await fetch(viaProxy(url), {
      headers: { accept: 'application/json', ...authHeaders() },
      signal: AbortSignal.timeout(4_000),
      next: { revalidate }
    });
    if (!res.ok) {
      console.warn(`[tmdb] ${path} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[tmdb] ${path} network failure:`, error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

export type TmdbSearchItem = {
  id: number;
  media_type: MediaType;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  popularity?: number;
};

export type TmdbVideo = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1?: string;
  published_at?: string;
};

export type TmdbDetails = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres?: { id: number; name: string }[];
  created_by?: { id: number; name: string }[];
  credits?: {
    crew?: { job: string; name: string }[];
    cast?: { name: string; character?: string }[];
  };
  aggregate_credits?: {
    crew?: { job?: string; department?: string; name: string }[];
    cast?: { name: string; roles?: { character?: string }[] }[];
  };
};

export const tmdbImage = (path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500') =>
  path ? `${IMG}/${size}${path}` : '';

/** Search movies and TV shows together, in TMDB relevance order. */
export async function searchTitles(query: string) {
  const clean = query.trim().slice(0, 100);
  if (!tmdbConfigured() || clean.length < 2) return { configured: tmdbConfigured(), results: [] as TmdbSearchItem[] };
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>('/search/multi', {
    query: clean,
    include_adult: 'false',
    language: 'en-US',
    page: '1'
  }, 300);
  const results = (data?.results ?? [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 20);
  return { configured: true, results };
}

export async function trendingTitles() {
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>('/trending/all/week', { language: 'en-US' }, 1800);
  return (data?.results ?? []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
}

/** Fetch YouTube-hosted trailer/teaser IDs already associated with a TMDB title. */
export async function fetchTitleVideos(id: number, mediaType: MediaType = 'movie', language = 'en-US') {
  if (!Number.isSafeInteger(id) || id <= 0) return [] as TmdbVideo[];
  const data = await tmdbFetch<{ results?: TmdbVideo[] }>(`/${mediaType}/${id}/videos`, { language }, 1800);
  return Array.isArray(data?.results) ? data.results : [];
}

export type NormalizedTmdbTitle = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number;
  runtime: number;
  overview: string;
  poster: string;
  backdrop: string;
  genres: string[];
  director: string | null;
  cast: { name: string; role: string }[];
  imdbRating: number;
};

export async function fetchTitle(id: number, mediaType: MediaType = 'movie'): Promise<NormalizedTmdbTitle | null> {
  const append = mediaType === 'tv' ? 'aggregate_credits' : 'credits';
  const data = await tmdbFetch<TmdbDetails>(`/${mediaType}/${id}`, { append_to_response: append, language: 'en-US' }, 3600);
  if (!data) return null;

  const tvCast = data.aggregate_credits?.cast ?? [];
  const movieCast = data.credits?.cast ?? [];
  const director = mediaType === 'tv'
    ? data.created_by?.map((person) => person.name).filter(Boolean).slice(0, 2).join(', ') || data.aggregate_credits?.crew?.find((person) => person.job === 'Director')?.name || null
    : data.credits?.crew?.find((person) => person.job === 'Director')?.name ?? null;
  const title = data.title ?? data.name ?? `Untitled ${mediaType}`;
  const releaseDate = data.release_date ?? data.first_air_date ?? '';

  return {
    tmdbId: data.id,
    mediaType,
    title,
    year: Number(releaseDate.slice(0, 4)) || new Date().getFullYear(),
    runtime: data.runtime ?? data.episode_run_time?.[0] ?? 0,
    overview: data.overview || 'No synopsis available.',
    poster: imgUrl(data.poster_path, 'w500'),
    backdrop: imgUrl(data.backdrop_path, 'w1280'),
    genres: (data.genres ?? []).map((genre) => genre.name).slice(0, 3),
    director,
    cast: (mediaType === 'tv' ? tvCast : movieCast).slice(0, 6).map((person: any) => ({
      name: person.name,
      role: mediaType === 'tv' ? person.roles?.[0]?.character ?? 'Cast' : person.character ?? 'Cast'
    })),
    imdbRating: Math.round((data.vote_average ?? 0) * 10) / 10
  };
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
