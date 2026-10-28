import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const [titles, reviews] = await Promise.all([
    prisma.title.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true } }),
    prisma.review.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, createdAt: true }, take: 200, orderBy: { createdAt: 'desc' } })
  ]);

  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/movies`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/reviews`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/community`, changeFrequency: 'weekly', priority: 0.5 },
    ...titles.map((t) => ({ url: `${base}/movies/${t.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...reviews.map((r) => ({ url: `${base}/reviews/${r.id}`, lastModified: r.createdAt, changeFrequency: 'weekly' as const, priority: 0.6 }))
  ];
}
