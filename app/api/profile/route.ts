import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

const schema = z.object({
  name: z.string().min(2).max(40),
  bio: z.string().max(200).optional().default('')
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Name 2–40 characters' }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, bio: parsed.data.bio }
  });
  return NextResponse.json({ ok: true });
}
