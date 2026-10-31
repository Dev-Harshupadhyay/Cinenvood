import { NextResponse } from 'next/server';
import { searchImdbTitles } from '@/lib/imdbio';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const query = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const gate = await rateLimit(`imdb-search:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ error: 'Search is rate-limited; wait a moment and retry.', results: [] }, { status: 429 });

  const results = await searchImdbTitles(query).catch(() => []);
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
}
