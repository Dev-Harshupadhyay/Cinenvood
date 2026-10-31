import type { Metadata } from 'next';
import Link from 'next/link';
import JarvisAssistant from '@/components/JarvisAssistant';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Jarvis Review Studio · Cinevood',
  description: 'Draft a movie review in your own voice with IMDbio title search, posters, cast, and your Gemini API key; also ask grounded movie questions.',
  robots: { index: false, follow: true }
};

export default async function JarvisPage({ searchParams }: { searchParams: Promise<{ titleId?: string }> }) {
  const { titleId = '' } = await searchParams;
  const session = await getSessionUser();
  let titles: { id: string; title: string; year: number; poster: string }[] = [];
  let unavailable = false;
  try {
    titles = await prisma.title.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      take: 500,
      select: { id: true, title: true, year: true, poster: true }
    });
  } catch {
    unavailable = true;
  }

  return (
    <main className="container page-clip jarvis-page">
      <JarvisAssistant titles={titles} initialTitleId={titleId} catalogueUnavailable={unavailable || titles.length === 0} signedIn={Boolean(session?.email)} />
      <div className="jarvis-back"><Link href="/movies" className="btn btn-ghost">Browse the catalogue</Link></div>
    </main>
  );
}
