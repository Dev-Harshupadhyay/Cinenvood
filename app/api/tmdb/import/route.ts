import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { fetchTitle, slugify, tmdbConfigured } from '@/lib/tmdb';

const schema = z.object({ id: z.number().int().positive(), mediaType: z.enum(['movie', 'tv']).default('movie') });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  if (!tmdbConfigured()) return NextResponse.json({ error: 'TMDB_API_KEY missing' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid TMDB result' }, { status: 400 });

  const details = await fetchTitle(parsed.data.id, parsed.data.mediaType);
  if (!details) return NextResponse.json({ error: 'TMDB fetch failed — retry in a moment.' }, { status: 502 });

  const existing = await prisma.title.findUnique({ where: { tmdbId: details.tmdbId }, select: { slug: true } });
  let slug = existing?.slug ?? slugify(`${details.title}-${details.year}`);
  if (!existing) {
    const clash = await prisma.title.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${details.tmdbId}`;
  }

  const title = await prisma.title.upsert({
    where: { tmdbId: details.tmdbId },
    update: {
      title: details.title,
      mediaType: details.mediaType,
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
      mediaType: details.mediaType,
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
