import { timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { rateLimit, LIMITS } from '@/lib/rate-limit';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

/** Google OAuth is the sign-in method for regular members. */
export const isGoogleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/**
 * Local-only shortcut: when Google keys are absent and we're not in production,
 * allow password-less member login for local testing only.
 */
const devFallback = !isGoogleEnabled && process.env.NODE_ENV !== 'production';

const providers = [
  Credentials({
    id: 'admin-password',
    name: 'Admin password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' }
    },
    async authorize(raw) {
      const email = String(raw?.email ?? '').trim().toLowerCase();
      const password = String(raw?.password ?? '');
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD || email !== ADMIN_EMAIL || !password) return null;

      // Slow down password guessing per IP + configured admin account.
      const h = await headers();
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
      const gate = await rateLimit(`admin-login:${ip}:${email}`, 6, 15 * 60_000);
      if (!gate.ok) return null;

      const expected = Buffer.from(ADMIN_PASSWORD, 'utf8');
      const candidate = Buffer.from(password, 'utf8');
      if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) return null;

      const user = await prisma.user.upsert({
        where: { email },
        update: { role: 'ADMIN' },
        create: { email, name: 'CINE·MOOD Admin', role: 'ADMIN' }
      });
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    }
  }),
  ...(isGoogleEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          allowDangerousEmailAccountLinking: true,
          authorization: { params: { prompt: 'select_account' } }
        })
      ]
    : []),
  ...(devFallback
    ? [
        Credentials({
          id: 'dev-email',
          name: 'Local dev only',
          credentials: {
            email: { label: 'Email', type: 'email' },
            name: { label: 'Name', type: 'text' }
          },
          async authorize(raw) {
            const email = String(raw?.email ?? '').trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
            const name = String(raw?.name ?? '').trim() || email.split('@')[0];
            const user = await prisma.user.upsert({
              where: { email },
              update: {},
              create: { email, name, role: 'USER' }
            });
            return { id: user.id, email: user.email, name: user.name, image: user.image };
          }
        })
      ]
    : [])
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', error: '/login' },
  providers,
  callbacks: {
    /** Mirror Google accounts into Postgres; password admin account is created in authorize(). */
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      const email = user.email.toLowerCase();
      const provider = account?.provider ?? 'google';

      if (provider === 'admin-password') return email === ADMIN_EMAIL;

      const image = user.image ?? (profile as { picture?: string } | undefined)?.picture ?? null;
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { image: true, name: true }
      });
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          googleImage: image ?? undefined,
          image: existing?.image ?? image ?? undefined,
          name: existing?.name ?? user.name ?? undefined
        },
        create: {
          email,
          name: user.name ?? email.split('@')[0],
          image,
          googleImage: image,
          role: 'USER'
        }
      });

      prisma.pageView
        .create({
          data: { path: '/auth/signin', referrer: provider, device: 'desktop', guest: false, visitor: dbUser.id }
        })
        .catch(() => null);

      return true;
    },
    async jwt({ token, user, account }) {
      if (account) {
        token.adminPasswordLogin = account.provider === 'admin-password' && user?.email?.toLowerCase() === ADMIN_EMAIL;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = token.adminPasswordLogin === true && token.email.toLowerCase() === ADMIN_EMAIL ? dbUser.role : 'USER';
          token.name = dbUser.name;
          token.picture = dbUser.image ?? token.picture;
        } else if (user) {
          token.uid = user.id;
          token.role = 'USER';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? '';
        session.user.adminPasswordLogin = token.adminPasswordLogin === true;
        session.user.role = token.adminPasswordLogin === true ? (token.role as 'USER' | 'ADMIN') ?? 'USER' : 'USER';
      }
      return session;
    }
  }
});
