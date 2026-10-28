import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@cinemood.app').toLowerCase();

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers = [
  ...(googleEnabled
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!
        })
      ]
    : []),
  Credentials({
    id: 'demo',
    name: 'Demo account',
    credentials: {
      email: { label: 'Email', type: 'email' },
      name: { label: 'Name', type: 'text' }
    },
    async authorize(raw) {
      const email = String(raw?.email ?? '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
      const name = String(raw?.name ?? '').trim() || email.split('@')[0];
      const existing = await prisma.user.findUnique({ where: { email } });
      const user =
        existing ??
        (await prisma.user.create({
          data: { email, name, role: email === ADMIN_EMAIL ? 'ADMIN' : 'USER' }
        }));
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    }
  })
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      const email = user.email.toLowerCase();
      await prisma.user.upsert({
        where: { email },
        update: { name: user.name ?? undefined, image: user.image ?? undefined },
        create: {
          email,
          name: user.name ?? email.split('@')[0],
          image: user.image,
          role: email === ADMIN_EMAIL ? 'ADMIN' : 'USER'
        }
      });
      return true;
    },
    async jwt({ token, user }) {
      if (token.email && (!token.uid || user)) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
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

export const isGoogleEnabled = googleEnabled;
