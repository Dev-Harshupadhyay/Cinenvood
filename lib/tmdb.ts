/**
 * TMDB integration — real API, zero required in demo mode.
 *
 * .env mein TMDB_API_KEY daalo (v3 api key YA v4 bearer token) to ye live ho jaata hai:
 *   searchTitles()   → admin panel ka "Import from TMDB" search
 *   fetchTitle()     → full details (poster, backdrop, cast, runtime, genres, rating)
 *   importTitle()    → DB mein Title create/update
 *
 * Key na ho to functions { configured: false } return karte hain aur UI
 * seed catalogue pe chalta hai — demo kabhi break nahi hota.
 */

import { TMDB_API as BASE, TMDB_IMG as IMG, viaProxy } from './tmdb-proxy';

export function tmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY);
}

function authHeaders(): Record<string, string> {
  const key = process.env.TMDB_API_KEY ?? '';
  // v4 read access token (long JWT) vs v3 32-char key
  if (key.length > 40) return { Authorization: `Bearer ${key}` };
  return {};
}

function withKey(url: string) {
  const key = process.env.TMDB_API_KEY ?? '';
  if (key.length > 40) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${key}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  if (!tmdbConfigured()) return null;
  const qs = new URLSearchParams(params).toString();
  const url = withKey(`${BASE}${path}${qs ? `?${qs}` : ''}`);
  const res = await fetch(viaProxy(url), {
    headers: { accept: 'application/json', ...authHeaders() },
    next: { revalidate }
  });
  if (!res.ok) {
    console.warn(`[tmdb] ${path} → ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

export type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
};

export type TmdbDetails = {
  id: number;
  title: string;
  release_date?: string;
  runtime?: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres?: { id: number; name: string }[];
  credits?: { crew?: { job: string; name: string }[]; cast?: { name: string; character?: string }[] };
};

export const tmdbImage = (path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500') =>
  path ? `${IMG}/${size}${path}` : '';

export async function searchTitles(query: string) {
  if (!tmdbConfigured() || query.trim().length < 2) return { configured: tmdbConfigured(), results: [] as TmdbSearchItem[] };
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>('/search/movie', {
    query: query.trim(),
    include_adult: 'false',
    language: 'en-US'
  }, 600);
  return { configured: true, results: (data?.results ?? []).slice(0, 12) };
}

export async function trendingTitles() {
  const data = await tmdbFetch<{ results: TmdbSearchItem[] }>('/trending/movie/week', { language: 'en-US' }, 1800);
  return data?.results ?? [];
}

export async function fetchTitle(id: number) {
  const data = await tmdbFetch<TmdbDetails>(`/movie/${id}`, { append_to_response: 'credits', language: 'en-US' }, 3600);
  if (!data) return null;
  const director = data.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null;
  return {
    tmdbId: data.id,
    title: data.title,
    year: Number((data.release_date ?? '').slice(0, 4)) || new Date().getFullYear(),
    runtime: data.runtime ?? 0,
    overview: data.overview || 'No synopsis available.',
    poster: tmdbImage(data.poster_path, 'w500'),
    backdrop: tmdbImage(data.backdrop_path, 'w1280'),
    genres: (data.genres ?? []).map((g) => g.name).slice(0, 3),
    director,
    cast: (data.credits?.cast ?? []).slice(0, 6).map((c) => ({ name: c.name, role: c.character ?? 'Cast' })),
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
