import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getImdbTitle, getImdbTitleForCatalogue, type ImdbTitle } from '@/lib/imdbio';
import { parseList } from '@/lib/format';
import { getCurrentUser } from '@/lib/session';
import { draftReviewInUserStyle } from '@/lib/jarvis-review';
import { LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  imdbId: z.string().regex(/^tt\d+$/).optional(),
  titleId: z.string().min(1).max(100).optional(),
  notes: z.string().trim().min(30).max(2400),
  rating: z.number().int().min(1).max(10),
  language: z.enum(['match', 'hinglish', 'english']).default('match'),
  spoiler: z.boolean().default(false),
  useOwnReviews: z.boolean().default(true),
  styleSample: z.string().trim().max(1800).optional().default(''),
  short: z.boolean().optional().default(false),
  consent: z.literal(true)
}).refine((data) => Boolean(data.imdbId || data.titleId), { message: 'Choose a valid title.' });

async function resolveReviewTitle(titleId?: string, imdbId?: string): Promise<ImdbTitle | null> {
  if (!titleId) return imdbId ? getImdbTitle(imdbId) : null;
  const local = await prisma.title.findUnique({ where: { id: titleId } });
  if (!local || local.status !== 'PUBLISHED') return null;

  const external = await getImdbTitleForCatalogue({
    title: local.title,
    year: local.year,
    mediaType: local.mediaType === 'tv' ? 'tv' : 'movie',
    imdbId: imdbId ?? local.imdbId
  }).catch(() => null);
  if (external) return external;

  const cast = parseList<{ name?: string; role?: string; img?: string | null }>(local.cast);
  return {
    imdbId: local.imdbId ?? '',
    title: local.title,
    titleLocalized: null,
    kind: local.mediaType === 'tv' ? 'tvSeries' : 'movie',
    coverUrl: local.poster || null,
    plot: local.overview || null,
    summaries: [],
    year: local.year || null,
    duration: local.runtime || null,
    rating: local.imdbRating,
    genres: parseList<string>(local.genres),
    directors: local.director ? [{ name: local.director, pictureUrl: null, characters: [] }] : [],
    stars: cast.filter((person) => person.name).slice(0, 10).map((person) => ({
      name: person.name!,
      pictureUrl: person.img ?? null,
      characters: person.role ? [person.role] : []
    }))
  };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to draft a review in your own style.' }, { status: 401 });

  const gate = await rateLimit(`jarvis-review:${user.id}`, LIMITS.jarvisReview.limit, LIMITS.jarvisReview.windowMs);
  if (!gate.ok) {
    return NextResponse.json({ error: 'Draft limit reached. Please wait before trying again.' }, {
      status: 429,
      headers: { 'Retry-After': String(gate.retryAfter), 'Cache-Control': 'no-store' }
    });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Add your own review notes (at least 30 characters), choose a rating, and confirm the Gemini data-use notice.' }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Jarvis review drafting is not configured. Set GEMINI_API_KEY on the server.' }, { status: 503 });
  }

  const [title, ownReviews] = await Promise.all([
    resolveReviewTitle(parsed.data.titleId, parsed.data.imdbId),
    parsed.data.useOwnReviews
      ? prisma.review.findMany({
          where: { userId: user.id, status: 'PUBLISHED', spoiler: false, editorial: false, body: { not: '' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { headline: true, body: true, sourceLang: true }
        }).catch(() => null)
      : Promise.resolve([])
  ]);

  if (!title) {
    return NextResponse.json({ error: 'IMDbio could not load this title’s metadata. Check the service and try again.' }, { status: 502 });
  }
  if (ownReviews === null) {
    return NextResponse.json({ error: 'Your style samples are temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  if (ownReviews.length === 0 && parsed.data.styleSample.trim().length < 40) {
    return NextResponse.json({ error: 'I could not find one of your published non-spoiler reviews. Paste at least 40 characters from a review you wrote, or publish one first.' }, { status: 409 });
  }

  const draft = await draftReviewInUserStyle({
    title,
    notes: parsed.data.notes,
    rating: parsed.data.rating,
    language: parsed.data.language,
    spoiler: parsed.data.spoiler,
    ownReviews,
    pastedStyleSample: parsed.data.useOwnReviews ? '' : parsed.data.styleSample,
    short: parsed.data.short
  });

  if (!draft) {
    return NextResponse.json({ error: 'Gemini could not draft the review right now. Try again later.' }, { status: 502 });
  }

  return NextResponse.json({
    title: { imdbId: title.imdbId, title: title.title, year: title.year, coverUrl: title.coverUrl },
    draft,
    styleSources: ownReviews.length,
    manualStyleSampleUsed: !parsed.data.useOwnReviews,
    note: 'This is an editable draft only. Review it yourself; it has not been saved or published.'
  }, { headers: { 'Cache-Control': 'no-store' } });
}
