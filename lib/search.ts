import { prisma } from '@/lib/prisma';
import { searchImdbTitles } from '@/lib/imdbio';

export type UnifiedSearchResult = {
  key: string;
  title: string;
  year: number;
  poster: string;
  score: number | null;
  mediaType: 'movie' | 'tv';
  href: string;
  source: 'catalogue' | 'imdb';
  overview?: string;
};

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

export async function searchEverywhere(input: string): Promise<UnifiedSearchResult[]> {
  const q = input.trim().slice(0, 100);
  if (q.length < 2) return [];

  const [localRows, imdb] = await Promise.all([
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
        id: true, slug: true, imdbId: true, mediaType: true, title: true, year: true,
        poster: true, imdbRating: true, tmdbScore: true,
        reviews: { where: { status: 'PUBLISHED' }, select: { rating: true } }
      }
    }).catch(() => []),
    searchImdbTitles(q).catch(() => [])
  ]);

  const normalizedQuery = normalize(q);
  const local: UnifiedSearchResult[] = localRows.map((row) => {
    const ratings = row.reviews.map((review) => review.rating);
    const communityScore = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
    return {
      key: `catalogue-${row.id}`, title: row.title, year: row.year, poster: row.poster,
      score: communityScore !== null ? Math.round(communityScore * 10) / 10 : row.imdbRating,
      mediaType: row.mediaType === 'tv' ? 'tv' : 'movie', href: `/movies/${row.slug}`,
      source: 'catalogue'
    };
  }).sort((a, b) => {
    const aExact = normalize(a.title) === normalizedQuery ? 1 : 0;
    const bExact = normalize(b.title) === normalizedQuery ? 1 : 0;
    return bExact - aExact || (b.score ?? 0) - (a.score ?? 0);
  });

  const knownImdbIds = new Set(localRows.map((row) => row.imdbId).filter(Boolean));
  const localNames = new Set(local.map((item) => `${item.mediaType}:${normalize(item.title)}`));
  const external: UnifiedSearchResult[] = imdb
    .filter((item) => !knownImdbIds.has(item.imdbId || item.id))
    .filter((item) => !localNames.has(`${item.kind?.toLowerCase().includes('tv') ? 'tv' : 'movie'}:${normalize(item.title)}`))
    .map((item) => ({
      key: `imdb-${item.imdbId || item.id}`,
      title: item.title || item.title_localized || 'Untitled',
      year: Number(item.year) || 0,
      poster: item.cover_url || '/posters/placeholder.svg',
      score: typeof item.rating === 'number' ? item.rating : null,
      mediaType: item.kind?.toLowerCase().includes('tv') ? 'tv' as const : 'movie' as const,
      href: `/imdb/${item.imdbId || item.id}`,
      source: 'imdb' as const,
    }));

  return [...local.slice(0, 8), ...external.slice(0, 12)].slice(0, 20);
}
