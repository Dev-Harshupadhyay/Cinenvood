import { NextResponse } from 'next/server';
import { getImdbTitle } from '@/lib/imdbio';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^tt\d+$/.test(id)) return NextResponse.json({ error: 'Invalid IMDb title ID.' }, { status: 400 });

  const gate = await rateLimit(`imdb-title:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ error: 'Too many detail requests; wait a moment and retry.' }, { status: 429 });

  const title = await getImdbTitle(id);
  if (!title) return NextResponse.json({ error: 'IMDbio details are temporarily unavailable.' }, { status: 502 });

  return NextResponse.json({
    imdbId: title.imdbId,
    title: title.title,
    year: title.year,
    kind: title.kind,
    coverUrl: title.coverUrl,
    plot: title.plot,
    duration: title.duration,
    rating: title.rating,
    genres: title.genres,
    directors: title.directors.map((person) => person.name).slice(0, 5),
    cast: title.stars.slice(0, 8).map((person) => ({ name: person.name, characters: person.characters }))
  }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
}
