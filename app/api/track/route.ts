import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { rateLimit, clientIp, LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT = /bot|crawler|spider|crawling|headless|preview|pingdom|lighthouse/i;

export async function POST(req: Request) {
  try {
    // Bots and link-previewers shouldn't pollute the numbers.
    if (BOT.test(req.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 });

    const ip = clientIp(req);
    const gate = await rateLimit(`track:${ip}`, LIMITS.track.limit, LIMITS.track.windowMs);
    if (!gate.ok) return new Response(null, { status: 429 });

    const body = (await req.json().catch(() => null)) as
      | { path?: string; referrer?: string | null; device?: string; lang?: string; guestId?: string }
      | null;
    if (!body?.path) return new Response(null, { status: 204 });

    const path = String(body.path).slice(0, 180);
    const user = await getCurrentUser().catch(() => null);

    // Anonymous but stable visitor key (never stores the raw guest id).
    const visitor = user
      ? `u_${user.id}`
      : body.guestId
        ? `h_${createHash('sha256').update(`${body.guestId}:cinemood`).digest('hex').slice(0, 24)}`
        : null;

    const title = path.startsWith('/movies/')
      ? await prisma.title.findUnique({ where: { slug: path.replace('/movies/', '') }, select: { id: true } }).catch(() => null)
      : null;

    await prisma.pageView.create({
      data: {
        path,
        titleId: title?.id ?? null,
        referrer: body.referrer ? String(body.referrer).slice(0, 120) : null,
        device: body.device ? String(body.device).slice(0, 10) : null,
        lang: body.lang ? String(body.lang).slice(0, 8) : null,
        guest: !user,
        visitor
      }
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
