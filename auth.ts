import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@cinemood.app').trim().toLowerCase();

/** Google OAuth is the only production sign-in. */
export const isGoogleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/**
 * Local-only shortcut: when Google keys are absent **and** we're not in
 * production, allow a password-less email login so the app can be tested.
 * It is compiled out of any Vercel/production runtime and can never create
 * an admin unless the email equals ADMIN_EMAIL.
 */
const devFallback = !isGoogleEnabled && process.env.NODE_ENV !== 'production';

const providers = [
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
              create: { email, name, role: email === ADMIN_EMAIL ? 'ADMIN' : 'USER' }
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
    /** Every real sign-in is mirrored into Postgres — Google profile included. */
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      const email = user.email.toLowerCase();
      const image = user.image ?? (profile as { picture?: string } | undefined)?.picture ?? null;
      const provider = account?.provider ?? 'google';

      // A member can override their photo/name in the dashboard — signing in again
      // must never wipe that. Google's own picture is kept aside so it can be restored.
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
          role: email === ADMIN_EMAIL ? 'ADMIN' : 'USER'
        }
      });

      // First-party analytics: how people actually arrive.
      prisma.pageView
        .create({
          data: { path: '/auth/signin', referrer: provider, device: 'desktop', guest: false, visitor: dbUser.id }
        })
        .catch(() => null);

      return true;
    },
    async jwt({ token, user }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.picture = dbUser.image ?? token.picture;
        } else if (user) {
          token.uid = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? '';
        session.user.role = (token.role as 'USER' | 'ADMIN') ?? 'USER';
      }
      return session;
    }
  }
});
