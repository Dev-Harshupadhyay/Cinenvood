import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseList } from '@/lib/format';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const rows = await prisma.title.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ title: { contains: q, mode: 'insensitive' } }, { overview: { contains: q, mode: 'insensitive' } }, { director: { contains: q, mode: 'insensitive' } }]
    },
    take: 6,
    include: { reviews: { where: { status: 'PUBLISHED' }, select: { rating: true } } }
  });

  return NextResponse.json({
    results: rows.map((t) => {
      const ratings = t.reviews.map((r) => r.rating);
      return {
        slug: t.slug,
        title: t.title,
        year: t.year,
        poster: t.poster,
        genres: parseList<string>(t.genres),
        score: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : t.imdbRating
      };
    })
  });
}
