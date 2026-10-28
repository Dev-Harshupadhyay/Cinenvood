import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { fetchTitle, slugify, tmdbConfigured } from '@/lib/tmdb';

const schema = z.object({ id: z.number().int().positive() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  if (!tmdbConfigured()) return NextResponse.json({ error: 'TMDB_API_KEY missing in .env' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid TMDB id' }, { status: 400 });

  const details = await fetchTitle(parsed.data.id);
  if (!details) return NextResponse.json({ error: 'TMDB fetch failed' }, { status: 502 });

  let slug = slugify(`${details.title}-${details.year}`);
  const clash = await prisma.title.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${details.tmdbId}`;

  const title = await prisma.title.upsert({
    where: { tmdbId: details.tmdbId },
    update: {
      title: details.title,
      year: details.year,
      runtime: details.runtime,
      overview: details.overview,
      poster: details.poster,
      backdrop: details.backdrop || details.poster,
      genres: JSON.stringify(details.genres),
      director: details.director,
      cast: JSON.stringify(details.cast),
      imdbRating: details.imdbRating
    },
    create: {
      tmdbId: details.tmdbId,
      slug,
      title: details.title,
      year: details.year,
      runtime: details.runtime,
      overview: details.overview,
      poster: details.poster,
      backdrop: details.backdrop || details.poster,
      genres: JSON.stringify(details.genres),
      director: details.director,
      cast: JSON.stringify(details.cast),
      imdbRating: details.imdbRating
    }
  });

  return NextResponse.json({ title });
}
