import { NextResponse } from 'next/server';
import { searchTitles, tmdbImage } from '@/lib/tmdb';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const q = new URL(req.url).searchParams.get('q') ?? '';
  const { configured, results } = await searchTitles(q);

  return NextResponse.json({
    configured,
    results: results.map((r) => ({
      id: r.id,
      title: r.title ?? r.name ?? '',
      year: (r.release_date ?? r.first_air_date ?? '').slice(0, 4),
      poster: tmdbImage(r.poster_path, 'w342'),
      vote: r.vote_average ?? 0,
      overview: r.overview ?? ''
    }))
  });
}
