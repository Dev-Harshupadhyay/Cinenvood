import { NextResponse } from 'next/server';
import { getImdbTitleForCatalogue } from '@/lib/imdbio';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';
import { searchTitles, tmdbImage } from '@/lib/tmdb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeTitle(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const title = (params.get('title') ?? '').trim().slice(0, 100);
  const yearValue = (params.get('year') ?? '').trim();
  const year = /^\d{4}$/.test(yearValue) ? Number(yearValue) : 0;
  const mediaType = params.get('mediaType') === 'tv' ? 'tv' : 'movie';
  const imdbId = (params.get('imdbId') ?? '').trim();
  const source = params.get('source') === 'tmdb' ? 'tmdb' : 'imdbio';

  if (imdbId && !/^tt\d+$/.test(imdbId)) {
    return NextResponse.json({ coverUrl: null, error: 'Invalid IMDb ID.' }, { status: 400 });
  }
  if (title.length < 2 && !(source === 'imdbio' && imdbId)) {
    return NextResponse.json({ coverUrl: null, error: 'A title or valid IMDb ID is required.' }, { status: 400 });
  }

  const gate = await rateLimit(`poster-fallback:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ coverUrl: null }, { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } });

  let coverUrl: string | null = null;
  try {
    if (source === 'tmdb') {
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
          const aYear = Number((a.release_date ?? a.first_air_date ?? '').slice(0, 4)) || 0;
          const bYear = Number((b.release_date ?? b.first_air_date ?? '').slice(0, 4)) || 0;
          return Number(bYear === year) - Number(aYear === year);
        })[0];
      coverUrl = match ? tmdbImage(match.poster_path, 'w500') || null : null;
    } else {
      const result = await getImdbTitleForCatalogue({ title, year, mediaType, imdbId: imdbId || null });
      coverUrl = result?.coverUrl ?? null;
    }
  } catch (error) {
    console.warn('[poster-fallback] lookup failed:', error instanceof Error ? error.message : 'unknown');
  }

  return NextResponse.json({ coverUrl }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
