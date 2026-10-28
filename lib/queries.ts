import { prisma } from '@/lib/prisma';
import { parseList } from '@/lib/format';

export type PosterTitle = {
  id: string;
  slug: string;
  title: string;
  year: number;
  runtime: number;
  poster: string;
  genres: string[];
  imdbRating: number | null;
  reviewCount: number;
  likes: number;
  communityScore: number | null;
};

const titleSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  runtime: true,
  poster: true,
  genres: true,
  imdbRating: true,
  _count: { select: { reviews: true, likes: true } },
  reviews: { where: { status: 'PUBLISHED' as const }, select: { rating: true } }
} as const;

function mapTitle(t: any): PosterTitle {
  const ratings: number[] = (t.reviews ?? []).map((r: { rating: number }) => r.rating);
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    year: t.year,
    runtime: t.runtime,
    poster: t.poster,
    genres: parseList<string>(t.genres),
    imdbRating: t.imdbRating,
    reviewCount: t._count?.reviews ?? 0,
    likes: t._count?.likes ?? 0,
    communityScore: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null
  };
}

export async function getCatalogue(opts: { q?: string; genre?: string; sort?: string; take?: number } = {}) {
  const { q, genre, sort = 'trending', take = 60 } = opts;
  const where: any = { status: 'PUBLISHED' };
  if (q) {
    where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { overview: { contains: q, mode: 'insensitive' } }, { director: { contains: q, mode: 'insensitive' } }];
  }
  const rows = await prisma.title.findMany({ where, select: titleSelect });
  let list = rows.map(mapTitle);
  if (genre && genre !== 'All') list = list.filter((t) => t.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  const by: Record<string, (a: PosterTitle, b: PosterTitle) => number> = {
    trending: (a, b) => b.likes * 2 + b.reviewCount * 3 - (a.likes * 2 + a.reviewCount * 3),
    newest: (a, b) => b.year - a.year,
    rating: (a, b) => (b.communityScore ?? b.imdbRating ?? 0) - (a.communityScore ?? a.imdbRating ?? 0),
    title: (a, b) => a.title.localeCompare(b.title)
  };
  list.sort(by[sort] ?? by.trending);
  return list.slice(0, take);
}

export async function getFeatured() {
  const row = await prisma.title.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
    select: { ...titleSelect, backdrop: true, overview: true, director: true, cast: true }
  });
  if (!row) return null;
  return { ...mapTitle(row), backdrop: (row as any).backdrop, overview: (row as any).overview, director: (row as any).director, cast: parseList<{ name: string; role: string }>((row as any).cast) };
}

export async function getTitleBySlug(slug: string) {
  const row = await prisma.title.findUnique({
    where: { slug },
    include: {
      reviews: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, name: true, email: true, image: true, bio: true, role: true } },
          _count: { select: { likes: true, comments: true } }
        }
      },
      _count: { select: { likes: true } }
    }
  });
  if (!row) return null;
  const ratings = row.reviews.map((r) => r.rating);
  return {
    ...row,
    genres: parseList<string>(row.genres),
    cast: parseList<{ name: string; role: string }>(row.cast),
    communityScore: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    ratingBuckets: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => ({ rating: n, count: ratings.filter((r) => r === n).length }))
  };
}

export async function withViewerLikes<T extends { id: string }>(reviews: T[], viewerId?: string | null) {
  if (!viewerId || reviews.length === 0) return reviews as (T & { likedByViewer: boolean })[];
  const likes = await prisma.reviewLike.findMany({
    where: { userId: viewerId, reviewId: { in: reviews.map((r) => r.id) } },
    select: { reviewId: true }
  });
  const set = new Set(likes.map((l) => l.reviewId));
  return reviews.map((r) => ({ ...r, likedByViewer: set.has(r.id) }));
}

export async function getLatestReviews(take = 6, opts: { excludeTitleId?: string; userId?: string } = {}) {
  return prisma.review.findMany({
    where: {
      status: 'PUBLISHED',
      ...(opts.excludeTitleId ? { titleId: { not: opts.excludeTitleId } } : {}),
      ...(opts.userId ? { userId: opts.userId } : {})
    },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take,
    include: {
      user: { select: { id: true, name: true, image: true, email: true, role: true } },
      title: { select: { id: true, slug: true, title: true, year: true, poster: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
}

export async function getTopReviews(take = 5) {
  return prisma.review.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ featured: 'desc' }, { likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take,
    include: {
      user: { select: { id: true, name: true, image: true, email: true, role: true } },
      title: { select: { id: true, slug: true, title: true, year: true, poster: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
}

export async function getReview(id: string) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, bio: true } },
      title: true,
      _count: { select: { likes: true } },
      comments: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, image: true, email: true, role: true } } }
      }
    }
  });
}

export async function getGenres() {
  const rows = await prisma.title.findMany({ where: { status: 'PUBLISHED' }, select: { genres: true } });
  const set = new Set<string>();
  rows.forEach((r) => parseList<string>(r.genres).forEach((g) => set.add(g)));
  return [...set].sort();
}

export async function getPlatformStats() {
  const [users, titles, reviews, comments, likes, watchlists] = await Promise.all([
    prisma.user.count(),
    prisma.title.count({ where: { status: 'PUBLISHED' } }),
    prisma.review.count({ where: { status: 'PUBLISHED' } }),
    prisma.comment.count({ where: { status: 'PUBLISHED' } }),
    prisma.reviewLike.count(),
    prisma.titleLike.count({ where: { kind: 'WATCHLIST' } })
  ]);
  return { users, titles, reviews, comments, likes, watchlists };
}

export async function getTopMembers(take = 5) {
  const users = await prisma.user.findMany({
    take,
    include: { _count: { select: { reviews: true } } },
    orderBy: { reviews: { _count: 'desc' } }
  });
  return users.filter((u) => u._count.reviews > 0);
}
