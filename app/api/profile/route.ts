import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

/** Photos are stored inline (base64) so there is no storage bill — keep them small. */
const MAX_DATA_URI = 220_000; // ~220 KB of text ≈ a 256×256 JPEG

const photo = z
  .string()
  .max(MAX_DATA_URI + 400)
  .refine(
    (v) =>
      /^https?:\/\/[^\s]+$/i.test(v) ||
      /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(v) ||
      v === '',
    { message: 'Image must be an https link or an uploaded image' }
  );

const schema = z.object({
  name: z.string().trim().min(2).max(40),
  bio: z.string().max(200).optional().default(''),
  /** '' / null = remove the custom photo and go back to the Google picture. */
  image: photo.nullish()
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const gate = await rateLimit(`profile:${user.id}`, LIMITS.profile.limit, LIMITS.profile.windowMs);
  if (!gate.ok) {
    return NextResponse.json({ error: 'Thoda ruk ke try karo — bahut zyada saves' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.path?.[0] === 'image' ? 'Photo too large — 220 KB se chhoti image chuno' : 'Name 2–40 characters' },
      { status: 400 }
    );
  }

  const { name, bio, image } = parsed.data;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { googleImage: true } });

  const nextImage =
    image === undefined
      ? undefined // field not sent → photo untouched
      : image === null
        ? row?.googleImage ?? null // "Use Google photo" → Google picture
        : image === ''
          ? null // "Remove photo" → initials only
          : image; // custom upload / link

  await prisma.user.update({
    where: { id: user.id },
    data: { name, bio, ...(nextImage === undefined ? {} : { image: nextImage }) }
  });

  return NextResponse.json({ ok: true, image: nextImage ?? null });
}
