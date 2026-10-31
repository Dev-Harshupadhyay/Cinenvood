import { prisma } from '@/lib/prisma';
import { parseList } from '@/lib/format';
import { withAuthor, withAuthors } from '@/lib/reviews';

export type PosterTitle = {
  id: string;
  slug: string;
  title: string;
  year: number;
  runtime: number;
  poster: string;
  genres: string[];
  imdbRating: number | null;
  tmdbScore: number | null;
  mediaType?: 'movie' | 'tv';
  overview?: string;
  backdrop?: string;
  reviewCount: number;
  likes: number;
  communityScore: number | null;
  trailerEn?: string | null;
  trailerHi?: string | null;
};

const titleSelect = {
  id: true,
  slug: true,
  title: true,
  mediaType: true,
  year: true,
  runtime: true,
  poster: true,
  backdrop: true,
  overview: true,
  genres: true,
  trailerEn: true,
  trailerHi: true,
  imdbRating: true,
  tmdbScore: true,
  _count: { select: { reviews: { where: { status: 'PUBLISHED' as const, editorial: false } }, likes: true } },
  reviews: { where: { status: 'PUBLISHED' as const, editorial: false }, select: { rating: true } }
} as const;

function mapTitle(t: any): PosterTitle {
  const ratings: number[] = (t.reviews ?? []).map((r: { rating: number }) => r.rating);
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    mediaType: t.mediaType === 'tv' ? 'tv' : 'movie',
    overview: t.overview ?? '',
    backdrop: t.backdrop ?? '',
    year: t.year,
    runtime: t.runtime,
    poster: t.poster,
    genres: parseList<string>(t.genres),
    imdbRating: t.imdbRating,
    tmdbScore: t.tmdbScore ?? null,
    reviewCount: t._count?.reviews ?? 0,
    likes: t._count?.likes ?? 0,
    communityScore: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    trailerEn: (t as any).trailerEn ?? null,
    trailerHi: (t as any).trailerHi ?? null
  };
}

export async function getCatalogue(opts: { q?: string; genre?: string; sort?: string; take?: number; mediaType?: 'movie' | 'tv' | 'all' } = {}) {
  const { q, genre, sort = 'trending', take = 60, mediaType = 'all' } = opts;
  const where: any = { status: 'PUBLISHED' };
  if (mediaType !== 'all') where.mediaType = mediaType;
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
        orderBy: [{ homeSpot: 'desc' }, { editorial: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, name: true, email: true, image: true, bio: true, role: true } },
          _count: { select: { likes: true, comments: true } }
        }
      },
      _count: { select: { likes: true } }
    }
  });
  if (!row) return null;
  const communityRatings = row.reviews.filter((review) => !review.editorial).map((review) => review.rating);
  return {
    ...row,
    reviews: withAuthors(row.reviews) as typeof row.reviews,
    genres: parseList<string>(row.genres),
    cast: parseList<{ name: string; role: string }>(row.cast),
    communityReviewCount: communityRatings.length,
    communityScore: communityRatings.length ? Math.round((communityRatings.reduce((a, b) => a + b, 0) / communityRatings.length) * 10) / 10 : null,
    ratingBuckets: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => ({ rating: n, count: communityRatings.filter((r) => r === n).length }))
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
  const rows = await prisma.review.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ sourceLang: null }, { sourceLang: { not: 'jarvis-auto' } }],
      ...(opts.excludeTitleId ? { titleId: { not: opts.excludeTitleId } } : {}),
      ...(opts.userId ? { userId: opts.userId } : {})
    },
    orderBy: [{ homeSpot: 'desc' }, { editorial: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
    take,
    include: {
      user: { select: { id: true, name: true, image: true, email: true, role: true } },
      title: { select: { id: true, slug: true, title: true, year: true, poster: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  return withAuthors(rows);
}

export async function getTopReviews(take = 5) {
  const rows = await prisma.review.findMany({
    where: { status: 'PUBLISHED', OR: [{ sourceLang: null }, { sourceLang: { not: 'jarvis-auto' } }] },
    orderBy: [{ homeSpot: 'desc' }, { editorial: 'desc' }, { featured: 'desc' }, { likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take,
    include: {
      user: { select: { id: true, name: true, image: true, email: true, role: true } },
      title: { select: { id: true, slug: true, title: true, year: true, poster: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  return withAuthors(rows);
}

export async function getReview(id: string) {
  const row = await prisma.review.findUnique({
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
  if (!row) return null;
  return {
    ...withAuthor(row),
    comments: row.comments.map((c) => ({ ...c, user: { ...c.user, role: (c.user.role ?? 'USER') as 'USER' | 'ADMIN' } }))
  };
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
    prisma.review.count({ where: { status: 'PUBLISHED', OR: [{ sourceLang: null }, { sourceLang: { not: 'jarvis-auto' } }] } }),
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

/* ── Analytics (admin) ────────────────────────────────────────────────── */
export type DayPoint = { day: string; views: number; visitors: number };
export type TopPath = { path: string; views: number };

export async function getAnalytics() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [daily, topPaths, topTitles, devices, refs, totals] = await Promise.all([
    prisma.$queryRaw<DayPoint[]>`
      SELECT to_char(d.day, 'DD Mon') AS day,
             COUNT(v.id)::int AS views,
             COUNT(DISTINCT v.visitor)::int AS visitors
      FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS d(day)
      LEFT JOIN "cinemood"."PageView" v ON date_trunc('day', v."createdAt") = d.day
      GROUP BY d.day ORDER BY d.day`,
    prisma.$queryRaw<TopPath[]>`
      SELECT path, COUNT(*)::int AS views FROM "cinemood"."PageView"
      WHERE "createdAt" > ${since30}
      GROUP BY path ORDER BY views DESC LIMIT 8`,
    prisma.$queryRaw<{ title: string; slug: string; views: number }[]>`
      SELECT t.title, t.slug, COUNT(*)::int AS views
      FROM "cinemood"."PageView" v JOIN "cinemood"."Title" t ON t.id = v."titleId"
      WHERE v."createdAt" > ${since30}
      GROUP BY t.title, t.slug ORDER BY views DESC LIMIT 8`,
    prisma.$queryRaw<{ device: string; views: number }[]>`
      SELECT COALESCE(device, 'unknown') AS device, COUNT(*)::int AS views
      FROM "cinemood"."PageView" WHERE "createdAt" > ${since30}
      GROUP BY device ORDER BY views DESC`,
    prisma.$queryRaw<{ referrer: string; views: number }[]>`
      SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*)::int AS views
      FROM "cinemood"."PageView" WHERE "createdAt" > ${since30}
      GROUP BY referrer ORDER BY views DESC LIMIT 6`,
    prisma.$queryRaw<{ total: number; last7: number; visitors7: number; guests: number; members: number }[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE "createdAt" > ${since7})::int AS last7,
             COUNT(DISTINCT visitor) FILTER (WHERE "createdAt" > ${since7})::int AS visitors7,
             COUNT(*) FILTER (WHERE guest)::int AS guests,
             COUNT(*) FILTER (WHERE NOT guest)::int AS members
      FROM "cinemood"."PageView"`
  ]);

  return {
    daily,
    topPaths,
    topTitles,
    devices,
    refs,
    total: totals[0]?.total ?? 0,
    last7: totals[0]?.last7 ?? 0,
    visitors7: totals[0]?.visitors7 ?? 0,
    guests: totals[0]?.guests ?? 0,
    members: totals[0]?.members ?? 0
  };
}
