import { NextResponse } from 'next/server';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';
import { searchEverywhere } from '@/lib/search';

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const ip = clientIp(req);
  const gate = await rateLimit(`search:${ip}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!gate.ok) return NextResponse.json({ results: [], limited: true }, { headers: { 'Cache-Control': 'no-store' } });

  try {
    const results = await searchEverywhere(q);
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.warn('[search] graceful fallback:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
