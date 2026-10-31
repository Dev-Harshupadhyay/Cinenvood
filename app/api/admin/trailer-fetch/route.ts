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
type YoutubeResponse = { items?: YoutubeItem[]; error?: { errors?: { reason?: string }[] } };
type YoutubeCandidate = { key: string; title: string; channel: string; thumbnail: string | null; likelyOfficial: boolean };

class YoutubeSearchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function searchTrailer(apiKey: string, query: string, language: string, region: string): Promise<YoutubeCandidate[]> {
  const relaxedQuery = query
    .replace(/\bofficial\b/gi, '')
    .replace(/\b(?:movie|tv series)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const queries = [...new Set([query, relaxedQuery])].filter(Boolean);
  for (const candidateQuery of queries) {
    const params = new URLSearchParams({
      part: 'snippet', type: 'video', maxResults: '8', q: candidateQuery,
      videoEmbeddable: 'true', safeSearch: 'moderate',
      relevanceLanguage: language, regionCode: region, key: apiKey
    });
    let response: Response;
    let data: YoutubeResponse;
    try {
      response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
        cache: 'no-store'
      });
      data = await response.json().catch(() => ({})) as YoutubeResponse;
    } catch {
      if (candidateQuery !== queries[queries.length - 1]) continue;
      throw new YoutubeSearchError('YouTube search timed out. Please try again.', 502);
    }
    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason;
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        throw new YoutubeSearchError('YouTube search quota is exhausted for now.', 429);
      }
      if (reason === 'keyInvalid' || reason === 'accessNotConfigured' || response.status === 403) {
        throw new YoutubeSearchError('YouTube API is unavailable. Check the server key and Data API settings.', 503);
      }
      throw new YoutubeSearchError('YouTube search is temporarily unavailable.', 502);
    }

    const results = (data.items ?? [])
      .filter((item) => item.id?.kind === 'youtube#video' && /^[A-Za-z0-9_-]{11}$/.test(item.id.videoId ?? ''))
      .map((item) => {
        const title = item.snippet?.title ?? 'YouTube video';
        const channel = item.snippet?.channelTitle ?? 'YouTube channel';
        return {
          key: item.id!.videoId!,
          title,
          channel,
          thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
          likelyOfficial: /\bofficial\b/i.test(`${title} ${channel}`)
        };
      })
      .sort((a, b) => Number(b.likelyOfficial) - Number(a.likelyOfficial));
    if (results.length) return results;
  }
  return [];
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

  const title = await prisma.title.findUnique({ where: { id: parsed.data.titleId }, select: { title: true, year: true, mediaType: true } });
  if (!title) return NextResponse.json({ error: 'Title not found' }, { status: 404 });

  const kind = title.mediaType === 'tv' ? 'TV series' : 'movie';
  const base = `${title.title} ${title.year} official ${kind} trailer`;
  try {
    const [enResult, hiResult] = await Promise.allSettled([
      searchTrailer(apiKey, `${base} English`, 'en', 'US'),
      searchTrailer(apiKey, `${base} Hindi`, 'hi', 'IN')
    ]);
    const en = enResult.status === 'fulfilled' ? enResult.value : [];
    const hi = hiResult.status === 'fulfilled' ? hiResult.value : [];
    if (enResult.status === 'rejected' && hiResult.status === 'rejected') throw enResult.reason;
    const warnings = [
      ...(enResult.status === 'rejected' ? ['English trailer search did not return results.'] : []),
      ...(hiResult.status === 'rejected' ? ['Hindi trailer search did not return results.'] : [])
    ];
    return NextResponse.json({ en, hi, query: title.title, warnings });
  } catch (error) {
    if (error instanceof YoutubeSearchError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'YouTube search is temporarily unavailable.' }, { status: 502 });
  }
}
