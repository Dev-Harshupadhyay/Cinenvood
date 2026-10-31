import { prisma } from '@/lib/prisma';
import { searchImdbTitles } from '@/lib/imdbio';
import { discoverTitlesByGenre, isGenreSearchTerm, searchTitles, type TmdbSearchItem } from '@/lib/tmdb';
import { imgUrl } from '@/lib/tmdb-proxy';

export type UnifiedSearchResult = {
  key: string;
  title: string;
  year: number;
  poster: string;
  score: number | null;
  mediaType: 'movie' | 'tv';
  href: string;
  titleId?: string;
  source: 'catalogue' | 'imdb' | 'tmdb';
  imdbId?: string;
  overview?: string;
  popularity?: number;
};

const MAX_RESULTS = 48;
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

function imdbMediaType(kind: string | null): 'movie' | 'tv' | null {
  const value = (kind ?? '').replace(/[^a-z]/gi, '').toLowerCase();
  if (['tvseries', 'tvminiseries', 'tvspecial', 'tvshort'].includes(value)) return 'tv';
  if (['movie', 'tvmovie', 'short'].includes(value)) return 'movie';
  return null;
}

function tmdbTitle(item: TmdbSearchItem) {
  return (item.title ?? item.name ?? '').trim();
}

function tmdbYear(item: TmdbSearchItem) {
  return Number((item.release_date ?? item.first_air_date ?? '').slice(0, 4)) || 0;
}

export async function searchEverywhere(input: string): Promise<UnifiedSearchResult[]> {
  const q = input.trim().slice(0, 100);
  if (q.length < 2) return [];

  const [localRows, imdb, tmdbResponse, tmdbGenreResults] = await Promise.all([
    prisma.title.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          // Genres are stored as JSON text; search them without flooding title matches with plot-text fallbacks.
          { genres: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 24,
      select: {
        id: true, slug: true, imdbId: true, tmdbId: true, mediaType: true, title: true, year: true,
        poster: true, imdbRating: true, tmdbScore: true,
        reviews: { where: { status: 'PUBLISHED', editorial: false }, select: { rating: true } }
      }
    }).catch(() => []),
    searchImdbTitles(q).catch(() => []),
    searchTitles(q).catch(() => ({ configured: false, results: [] as TmdbSearchItem[] })),
    discoverTitlesByGenre(q).catch(() => [] as TmdbSearchItem[])
  ]);

  const normalizedQuery = normalize(q);
  const local: UnifiedSearchResult[] = localRows.map((row) => {
    const ratings = row.reviews.map((review) => review.rating);
    const communityScore = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
    return {
      key: `catalogue-${row.id}`, title: row.title, year: row.year, poster: row.poster,
      score: communityScore !== null ? Math.round(communityScore * 10) / 10 : row.tmdbScore ?? row.imdbRating,
      mediaType: (row.mediaType === 'tv' ? 'tv' : 'movie') as 'tv' | 'movie', href: `/movies/${row.slug}`,
      titleId: row.id,
      source: 'catalogue' as const,
      ...(row.imdbId ? { imdbId: row.imdbId } : {})
    };
  }).sort((a, b) => {
    const aExact = normalize(a.title) === normalizedQuery ? 1 : 0;
    const bExact = normalize(b.title) === normalizedQuery ? 1 : 0;
    return bExact - aExact || (b.score ?? 0) - (a.score ?? 0);
  });

  const knownImdbIds = new Set(localRows.map((row) => row.imdbId).filter((value): value is string => Boolean(value)));
  const localNames = new Set(local.map((item) => `${item.mediaType}:${normalize(item.title)}`));
  const externalImdb: UnifiedSearchResult[] = imdb
    .map((item) => ({ item, mediaType: imdbMediaType(item.kind) }))
    .filter((entry): entry is { item: (typeof imdb)[number]; mediaType: 'movie' | 'tv' } => entry.mediaType !== null)
    .filter(({ item }) => !knownImdbIds.has(item.imdbId))
    .filter(({ item, mediaType }) => !localNames.has(`${mediaType}:${normalize(item.title || item.titleLocalized || '')}`))
    .map(({ item, mediaType }) => ({
      key: `imdb-${item.imdbId}`,
      title: item.title || item.titleLocalized || 'Untitled',
      year: item.year ?? 0,
      poster: item.coverUrl || '/posters/placeholder.svg',
      score: item.rating,
      mediaType,
      href: `/imdb/${item.imdbId}`,
      source: 'imdb' as const,
      imdbId: item.imdbId
    }));

  const visibleNames = new Set([
    ...localNames,
    ...externalImdb.map((item) => `${item.mediaType}:${normalize(item.title)}`)
  ]);
  const localTmdbIds = new Set(localRows.map((row) => row.tmdbId).filter((value): value is number => typeof value === 'number'));
  const tmdbResults = [...new Map([...tmdbGenreResults, ...tmdbResponse.results].map((item) => [`${item.media_type}:${item.id}`, item])).values()];
  const externalTmdb: UnifiedSearchResult[] = tmdbResults
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .filter((item) => !localTmdbIds.has(item.id))
    .filter((item) => {
      const title = tmdbTitle(item);
      return title && !visibleNames.has(`${item.media_type}:${normalize(title)}`);
    })
    .map((item) => ({
      key: `tmdb-${item.media_type}-${item.id}`,
      title: tmdbTitle(item) || 'Untitled',
      year: tmdbYear(item),
      poster: imgUrl(item.poster_path, 'w342'),
      score: Number.isFinite(item.vote_average) ? Math.round(item.vote_average * 10) / 10 : null,
      mediaType: item.media_type,
      href: `/explore/${item.media_type}/${item.id}`,
      source: 'tmdb' as const,
      overview: item.overview,
      popularity: item.popularity
    }));

  const external = [...externalImdb, ...externalTmdb].sort((a, b) => {
    const aExact = normalize(a.title) === normalizedQuery ? 1 : 0;
    const bExact = normalize(b.title) === normalizedQuery ? 1 : 0;
    return bExact - aExact || (b.popularity ?? b.score ?? 0) - (a.popularity ?? a.score ?? 0);
  });

  const combined = [...local, ...external];
  const exactTitles = combined.filter((item) => normalize(item.title) === normalizedQuery);
  // An exact title is a single, canonical hit; don't pad it with fallback matches from other sources.
  if (exactTitles.length && !isGenreSearchTerm(q)) return exactTitles.slice(0, 1);
  return combined.slice(0, MAX_RESULTS);
}
