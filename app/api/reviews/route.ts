import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, tooMany, LIMITS } from '@/lib/rate-limit';
import { detectLang, translateReview, translationEnabled } from '@/lib/translate';

const schema = z.object({
  titleId: z.string().min(1),
  rating: z.number().int().min(1).max(10),
  headline: z.string().max(90).optional().default(''),
  body: z.string().min(20, 'Review thoda lamba likho (min 20 characters)').max(4000),
  spoiler: z.boolean().optional().default(false)
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const gate = await rateLimit(`review:${user.id}`, LIMITS.review.limit, LIMITS.review.windowMs);
  if (!gate.ok) return tooMany(gate, `Review limit — ${gate.retryAfter}s baad try karo.`);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data' }, { status: 400 });
  }
  const { titleId, rating, headline, body, spoiler } = parsed.data;

  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) return NextResponse.json({ error: 'Title not found' }, { status: 404 });

  const sourceLang = detectLang(`${headline ?? ''} ${body}`);

  const review = await prisma.review.upsert({
    where: { userId_titleId: { userId: user.id, titleId } },
    update: { rating, headline, body, spoiler, sourceLang },
    create: { userId: user.id, titleId, rating, headline, body, spoiler, sourceLang }
  });

  /**
   * The other edition is written here, once, at save time.
   * Hinglish review → English copy for visitors outside India.
   * English review  → Hinglish copy for readers in India.
   * If GEMINI_API_KEY is missing (or the call fails) the review simply keeps
   * showing the original text in both editions.
   */
  let translated = false;
  if (translationEnabled && body.trim().length > 24) {
    try {
      const target = sourceLang === 'en' ? 'hinglish' : 'en';
      const out = await translateReview({ headline, body, target });
      if (out) {
        await prisma.review.update({
          where: { id: review.id },
          data:
            target === 'en'
              ? { bodyEn: out.body, headlineEn: out.headline ?? undefined, bodyHi: null, headlineHi: null }
              : { bodyHi: out.body, headlineHi: out.headline ?? undefined, bodyEn: null, headlineEn: null }
        });
        translated = true;
      }
    } catch {
      /* translation is a bonus — never fail the save because of it */
    }
  }

  return NextResponse.json({ review, sourceLang, translated });
}
