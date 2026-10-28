import { NextResponse } from 'next/server';

/**
 * Image relay for TMDB posters/backdrops.
 * Browser -> /api/img?p=w500/abc.jpg -> yahan se image.tmdb.org (ya TMDB_IMG_PROXY relay).
 * Isse ISP block hone par bhi posters load hote hain, aur key kabhi client tak nahi jaati.
 */

const ALLOWED = /^(\/)?(original|w\d{2,4}|h\d{2,4})\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = searchParams.get('p') ?? '';

  if (!ALLOWED.test(p)) {
    return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
  }

  const relay = process.env.TMDB_IMG_PROXY?.trim()?.replace(/\/+$/, '');
  const origin = relay ? `${relay}/img/${p}` : `https://image.tmdb.org/t/p/${p}`;

  try {
    const res = await fetch(origin, {
      headers: { accept: 'image/*', referer: 'https://www.themoviedb.org/' },
      next: { revalidate: 86400 }
    });
    if (!res.ok || !res.body) return NextResponse.json({ error: 'Upstream failed' }, { status: 502 });

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': 'public, max-age=86400, s-maxage=604800, immutable'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Image proxy unreachable' }, { status: 502 });
  }
}
