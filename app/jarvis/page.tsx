import type { Metadata } from 'next';
import Link from 'next/link';
import JarvisAssistant from '@/components/JarvisAssistant';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Ask Jarvis · Cinevood',
  description: 'Ask grounded questions about Cinevood movies, ratings and published review opinions.',
  robots: { index: false, follow: true }
};

export default async function JarvisPage({ searchParams }: { searchParams: Promise<{ titleId?: string }> }) {
  const { titleId = '' } = await searchParams;
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
      {unavailable ? (
        <div className="empty"><b>Catalogue is temporarily unavailable</b>Jarvis needs a Cinevood title record to gather grounded sources. Please try again later.</div>
      ) : titles.length ? (
        <JarvisAssistant titles={titles} initialTitleId={titleId} />
      ) : (
        <div className="empty"><b>No titles are available</b>Add or publish a catalogue title before asking Jarvis.</div>
      )}
      <div className="jarvis-back"><Link href="/movies" className="btn btn-ghost">Browse the catalogue</Link></div>
    </main>
  );
}
