import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ titleId: z.string().min(1) });

type YoutubeItem = {
  id?: { kind?: string; videoId?: string };
  snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } };
};

async function searchTrailer(apiKey: string, query: string, language: string, region: string) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '5',
    q: query,
    videoDuration: 'short',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    relevanceLanguage: language,
    regionCode: region,
    key: apiKey
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });
  const data = (await response.json().catch(() => ({}))) as { items?: YoutubeItem[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `YouTube API returned ${response.status}`);
  return (data.items ?? [])
    .filter((item) => item.id?.kind === 'youtube#video' && item.id.videoId)
    .map((item) => ({
      key: item.id!.videoId!,
      title: item.snippet?.title ?? 'YouTube video',
      channel: item.snippet?.channelTitle ?? 'YouTube channel',
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null
    }));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const gate = await rateLimit(`admin:youtube-search:${user.id}`, LIMITS.adminAction.limit, LIMITS.adminAction.windowMs);
  if (!gate.ok) return NextResponse.json({ error: 'Too many YouTube searches — wait a moment and retry.' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'Add YOUTUBE_API_KEY in Vercel Environment Variables, then redeploy.' }, { status: 503 });

  const title = await prisma.title.findUnique({ where: { id: parsed.data.titleId }, select: { title: true, year: true } });
  if (!title) return NextResponse.json({ error: 'Title not found' }, { status: 404 });

  const base = `${title.title} ${title.year} official movie trailer`;
  try {
    const [en, hi] = await Promise.all([
      searchTrailer(apiKey, `${base} English`, 'en', 'US'),
      searchTrailer(apiKey, `${base} Hindi`, 'hi', 'IN')
    ]);
    return NextResponse.json({ en, hi, query: title.title });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'YouTube search failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
