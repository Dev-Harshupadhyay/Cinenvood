import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getImdbReviews, getImdbTitle, searchImdbTitles } from '@/lib/imdbio';
import { generateAutoJarvisReviewOnce, imdbTitleFields } from '@/lib/jarvis-auto-review';
import { clientIp, LIMITS, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  titleId: z.string().min(1).max(100).optional(),
  imdbId: z.string().regex(/^tt\d+$/).optional()
}).refine((data) => Boolean(data.titleId || data.imdbId), { message: 'titleId or imdbId required' });

type JarvisRecord = {
  id: string;
  rating: number;
  headline: string | null;
  body: string;
  headlineHi: string | null;
  bodyHi: string | null;
  headlineEn: string | null;
  bodyEn: string | null;
  createdAt: Date;
};

function normalize(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
}

function mediaTypeForImdbKind(kind: string | null) {
  const normalized = kind?.toLowerCase();
  return normalized === 'tvseries' || normalized === 'tvminiseries' ? 'tv' : 'movie';
}

async function resolveImdbId(titleId: string | undefined, requestedImdbId: string | undefined) {
  if (!titleId) return { title: null, imdbId: requestedImdbId ?? null };
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title || title.status !== 'PUBLISHED') return { title: null, imdbId: null };
  if (requestedImdbId && title.imdbId && requestedImdbId !== title.imdbId) return { title, imdbId: null };
  if (requestedImdbId || title.imdbId) return { title, imdbId: requestedImdbId ?? title.imdbId };

  const candidates = await searchImdbTitles(`${title.title} ${title.year}`).catch(() => []);
  const wanted = normalize(title.title);
  const exact = wanted ? candidates.find((candidate) => {
    const titleMatches = [candidate.title, candidate.titleLocalized].some((name) => name && normalize(name) === wanted);
    const typeMatches = !candidate.kind || mediaTypeForImdbKind(candidate.kind) === title.mediaType;
    const yearMatches = !title.year || !candidate.year || Math.abs(candidate.year - title.year) <= 1;
    return titleMatches && typeMatches && yearMatches;
  }) : undefined;
  return { title, imdbId: exact?.imdbId ?? null };
}

async function ensureImdbTitleRecord(imdb: NonNullable<Awaited<ReturnType<typeof getImdbTitle>>>, localTitle: { id: string; imdbId: string | null } | null) {
  if (localTitle) {
    if (localTitle.imdbId && localTitle.imdbId !== imdb.imdbId) return null;
    await prisma.title.update({ where: { id: localTitle.id }, data: imdbTitleFields(imdb) });
    return localTitle.id;
  }

  const existing = await prisma.title.findFirst({ where: { imdbId: imdb.imdbId }, select: { id: true } });
  if (existing) return existing.id;

  const mediaType = mediaTypeForImdbKind(imdb.kind);
  const sameTitle = imdb.year === null ? null : await prisma.title.findFirst({
    where: { title: { equals: imdb.title, mode: 'insensitive' }, year: Math.round(imdb.year), mediaType },
    select: { id: true, imdbId: true }
  });
  if (sameTitle && !sameTitle.imdbId) {
    await prisma.title.update({ where: { id: sameTitle.id }, data: imdbTitleFields(imdb) });
    return sameTitle.id;
  }

  const slug = `imdb-${imdb.imdbId}`;
  const slugCollision = await prisma.title.findUnique({ where: { slug }, select: { id: true, title: true, year: true, imdbId: true } });
  if (slugCollision) {
    if (slugCollision.imdbId === imdb.imdbId) return slugCollision.id;
    const sameUnlinkedTitle = !slugCollision.imdbId && normalize(slugCollision.title) === normalize(imdb.title) && (!imdb.year || slugCollision.year === imdb.year);
    if (sameUnlinkedTitle) {
      await prisma.title.update({ where: { id: slugCollision.id }, data: imdbTitleFields(imdb) });
      return slugCollision.id;
    }
    return null;
  }

  const poster = imdb.coverUrl || '/posters/placeholder.svg';
  const created = await prisma.title.upsert({
    where: { slug },
    update: imdbTitleFields(imdb),
    create: {
      ...imdbTitleFields(imdb),
      slug,
      title: imdb.title,
      year: imdb.year === null ? 0 : Math.round(imdb.year),
      mediaType,
      runtime: imdb.duration === null ? 0 : Math.round(imdb.duration),
      overview: imdb.plot || imdb.summaries[0] || '',
      poster,
      backdrop: poster,
      genres: JSON.stringify(imdb.genres),
      cast: JSON.stringify(imdb.stars.slice(0, 12).map((person) => ({ name: person.name, role: person.characters.join(', '), img: person.pictureUrl }))),
      status: 'PUBLISHED'
    },
    select: { id: true }
  });
  return created.id;
}

async function getOwnerContext() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const owner = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } }) : null;
  const personalSamples = owner ? await prisma.review.findMany({
    where: { userId: owner.id, status: 'PUBLISHED', spoiler: false, editorial: false, body: { not: '' } },
    orderBy: { createdAt: 'desc' }, take: 5,
    select: { headline: true, body: true, sourceLang: true }
  }) : [];
  const names = [...new Set(['CiNEMAsFLiX', owner?.name].filter((name): name is string => Boolean(name)))];
  const editorialSamples = personalSamples.length >= 5 || names.length === 0 ? [] : await prisma.review.findMany({
    where: { editorial: true, status: 'PUBLISHED', spoiler: false, authorName: { in: names }, body: { not: '' } },
    orderBy: { createdAt: 'desc' }, take: 5 - personalSamples.length,
    select: { headline: true, body: true, sourceLang: true }
  });
  return { ownerId: owner?.id ?? null, samples: [...personalSamples, ...editorialSamples].slice(0, 5) };
}

async function hasManualReview(titleId: string, ownerId: string | null) {
  const ownerReview = ownerId ? await prisma.review.findFirst({
    where: { titleId, userId: ownerId, editorial: false },
    select: { id: true }
  }) : null;
  if (ownerReview) return true;
  const editorials = await prisma.review.findMany({
    where: { titleId, editorial: true },
    select: { authorName: true },
    take: 30
  });
  return editorials.some((review) => review.authorName?.trim().toLowerCase() !== 'jarvis');
}

async function getJarvisRecord(titleId: string): Promise<JarvisRecord | null> {
  return prisma.review.findFirst({
    where: { titleId, status: 'PUBLISHED', editorial: true, authorName: 'Jarvis', sourceLang: 'jarvis-auto-v2' },
    select: { id: true, rating: true, headline: true, body: true, headlineHi: true, bodyHi: true, headlineEn: true, bodyEn: true, createdAt: true }
  });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ status: 'unavailable', error: 'Choose a valid IMDbio title.' }, { status: 400 });
  const requestGate = await rateLimit(`jarvis-auto-request:${clientIp(req)}`, LIMITS.search.limit, LIMITS.search.windowMs);
  if (!requestGate.ok) return NextResponse.json({ status: 'limited', error: 'Too many title checks. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(requestGate.retryAfter) } });

  try {
    const resolved = await resolveImdbId(parsed.data.titleId, parsed.data.imdbId);
    if (parsed.data.titleId && !resolved.title) return NextResponse.json({ status: 'unavailable', error: 'Catalogue title not found.' }, { status: 404 });
    if (!resolved.imdbId) return NextResponse.json({ status: 'unavailable', error: 'Could not match this title to an exact IMDbio record.' }, { status: 404 });

    const imdb = await getImdbTitle(resolved.imdbId);
    if (!imdb) return NextResponse.json({ status: 'unavailable', error: 'IMDbio title details are temporarily unavailable.' }, { status: 502 });
    if (resolved.title) {
      const allowedNames = [imdb.title, imdb.titleLocalized].filter((name): name is string => Boolean(name)).map(normalize);
      const titleMatches = allowedNames.includes(normalize(resolved.title.title));
      const yearMatches = !resolved.title.year || !imdb.year || Math.abs(resolved.title.year - imdb.year) <= 1;
      const typeMatches = mediaTypeForImdbKind(imdb.kind) === resolved.title.mediaType;
      if (!titleMatches || !yearMatches || !typeMatches) return NextResponse.json({ status: 'unavailable', error: 'IMDbio details did not match the selected catalogue title.' }, { status: 409 });
    }
    const titleId = await ensureImdbTitleRecord(imdb, resolved.title ? { id: resolved.title.id, imdbId: resolved.title.imdbId } : null);
    if (!titleId) return NextResponse.json({ status: 'unavailable', error: 'IMDbio title did not match the selected catalogue record.' }, { status: 409 });

    const ownerContext = await getOwnerContext();
    if (await hasManualReview(titleId, ownerContext.ownerId)) return NextResponse.json({ status: 'manual' });

    const cached = await getJarvisRecord(titleId);
    if (cached) {
      return NextResponse.json({ status: 'ready', cached: true, review: cached, imdbRating: imdb.rating, sources: 'IMDbio metadata; non-spoiler reviews used when available' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const gate = await rateLimit(`jarvis-auto:${clientIp(req)}`, LIMITS.jarvisAutoReview.limit, LIMITS.jarvisAutoReview.windowMs);
    if (!gate.ok) return NextResponse.json({ status: 'limited', error: 'Jarvis is drafting other movie reviews right now. Please try again shortly.' }, { status: 429 });
    if (!process.env.GEMINI_API_KEY?.trim()) return NextResponse.json({ status: 'disabled', error: 'Jarvis AI reviews are temporarily unavailable.' }, { status: 503 });

    if (ownerContext.samples.length === 0) return NextResponse.json({ status: 'no-style', error: 'Jarvis needs a published, non-spoiler owner review as a style reference before it can create this review.' }, { status: 409 });
    const imdbReviews = await getImdbReviews(imdb.imdbId).catch(() => []);
    const draft = await generateAutoJarvisReviewOnce(imdb.imdbId, { title: imdb, styleSamples: ownerContext.samples, imdbReviews });
    if (!draft) return NextResponse.json({ status: 'unavailable', error: 'Jarvis could not prepare a grounded bilingual review right now.' }, { status: 502 });

    const saved = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${imdb.imdbId}, 0))`;
      const ownerReview = ownerContext.ownerId ? await tx.review.findFirst({
        where: { titleId, userId: ownerContext.ownerId, editorial: false },
        select: { id: true }
      }) : null;
      const editorialReviews = await tx.review.findMany({
        where: { titleId, editorial: true },
        select: { authorName: true },
        take: 30
      });
      if (ownerReview || editorialReviews.some((item) => item.authorName?.trim().toLowerCase() !== 'jarvis')) return { kind: 'manual' as const };

      const prior = await tx.review.findFirst({
        where: { titleId, status: 'PUBLISHED', editorial: true, authorName: 'Jarvis', sourceLang: 'jarvis-auto-v2' },
        select: { id: true, rating: true, headline: true, body: true, headlineHi: true, bodyHi: true, headlineEn: true, bodyEn: true, createdAt: true }
      });
      if (prior) return { kind: 'review' as const, review: prior, created: false };
      const legacy = await tx.review.findFirst({
        where: { titleId, status: 'PUBLISHED', editorial: true, authorName: 'Jarvis', sourceLang: 'jarvis-auto' },
        select: { id: true }
      });
      if (legacy) {
        const refreshed = await tx.review.update({
          where: { id: legacy.id },
          data: {
            rating: draft.rating,
            headline: draft.headlineHi,
            body: draft.bodyHi,
            headlineHi: draft.headlineHi,
            bodyHi: draft.bodyHi,
            headlineEn: draft.headlineEn,
            bodyEn: draft.bodyEn,
            sourceLang: 'jarvis-auto-v2'
          },
          select: { id: true, rating: true, headline: true, body: true, headlineHi: true, bodyHi: true, headlineEn: true, bodyEn: true, createdAt: true }
        });
        return { kind: 'review' as const, review: refreshed, created: true };
      }
      const created = await tx.review.create({
        data: {
          titleId,
          rating: draft.rating,
          headline: draft.headlineHi,
          body: draft.bodyHi,
          headlineHi: draft.headlineHi,
          bodyHi: draft.bodyHi,
          headlineEn: draft.headlineEn,
          bodyEn: draft.bodyEn,
          sourceLang: 'jarvis-auto-v2',
          editorial: true,
          authorName: 'Jarvis',
          status: 'PUBLISHED',
          spoiler: false,
          featured: false,
          homeSpot: false
        },
        select: { id: true, rating: true, headline: true, body: true, headlineHi: true, bodyHi: true, headlineEn: true, bodyEn: true, createdAt: true }
      });
      return { kind: 'review' as const, review: created, created: true };
    });

    if (saved.kind === 'manual') return NextResponse.json({ status: 'manual' });
    const sourceLabel = imdbReviews.some((item) => item.spoiler === false) ? 'IMDbio metadata and public non-spoiler reviews' : 'IMDbio metadata only; no non-spoiler public review evidence';
    return NextResponse.json({ status: 'ready', cached: !saved.created, review: saved.review, imdbRating: imdb.rating, sources: sourceLabel }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[jarvis-auto-review]', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ status: 'unavailable', error: 'Jarvis review is temporarily unavailable.' }, { status: 503 });
  }
}
