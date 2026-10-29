import { prisma } from '@/lib/prisma';
import { searchTitles, tmdbConfigured } from '@/lib/tmdb';

export type UnifiedSearchResult = {
  key: string;
  title: string;
  year: number;
  poster: string;
  score: number | null;
  mediaType: 'movie' | 'tv';
  href: string;
  source: 'catalogue' | 'tmdb';
  overview?: string;
};

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

export async function searchEverywhere(input: string): Promise<UnifiedSearchResult[]> {
  const q = input.trim().slice(0, 100);
  if (q.length < 2) return [];

  const [localRows, tmdb] = await Promise.all([
    prisma.title.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { overview: { contains: q, mode: 'insensitive' } },
          { director: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        slug: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        year: true,
        poster: true,
        imdbRating: true,
        tmdbScore: true,
        reviews: { where: { status: 'PUBLISHED' }, select: { rating: true } }
      }
    }).catch(() => []),
    tmdbConfigured() ? searchTitles(q).catch(() => ({ configured: false, results: [] })) : Promise.resolve({ configured: false, results: [] })
  ]);

  const normalizedQuery = normalize(q);
  const local: UnifiedSearchResult[] = localRows.map((row) => {
    const ratings = row.reviews.map((review) => review.rating);
    const communityScore = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
    const mediaType: 'movie' | 'tv' = row.mediaType === 'tv' ? 'tv' : 'movie';
    return {
      key: `catalogue-${row.id}`,
      title: row.title,
      year: row.year,
      poster: row.poster,
      score: communityScore !== null ? Math.round(communityScore * 10) / 10 : row.tmdbScore ?? row.imdbRating,
      mediaType,
      href: `/movies/${row.slug}`,
      source: 'catalogue' as const
    };
  }).sort((a, b) => {
    const aExact = normalize(a.title) === normalizedQuery ? 1 : 0;
    const bExact = normalize(b.title) === normalizedQuery ? 1 : 0;
    return bExact - aExact || (b.score ?? 0) - (a.score ?? 0);
  });

  const localTmdbIds = new Set(localRows.filter((row) => row.tmdbId !== null).map((row) => `${row.mediaType}:${row.tmdbId}`));
  const localNames = new Set(local.map((item) => `${item.mediaType}:${normalize(item.title)}`));
  const extra = (tmdb.results ?? [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .filter((item) => !localTmdbIds.has(`${item.media_type}:${item.id}`))
    .filter((item) => !localNames.has(`${item.media_type}:${normalize(item.title ?? item.name ?? '')}`))
    .map((item): UnifiedSearchResult => {
      const mediaType = item.media_type;
      const title = item.title ?? item.name ?? 'Untitled';
      const date = item.release_date ?? item.first_air_date ?? '';
      return {
        key: `tmdb-${mediaType}-${item.id}`,
        title,
        year: Number(date.slice(0, 4)) || 0,
        poster: item.poster_path ? `/api/img?p=${encodeURIComponent(`w342${item.poster_path}`)}` : '/posters/placeholder.svg',
        score: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
        mediaType,
        href: `/explore/${mediaType}/${item.id}`,
        source: 'tmdb',
        overview: item.overview ?? ''
      };
    });

  return [...local.slice(0, 8), ...extra.slice(0, 12)].slice(0, 20);
}
