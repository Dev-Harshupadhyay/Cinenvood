import { siteUrl } from '@/lib/site';
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// Build ke waqt DB chahiye hi nahi — runtime par generate hota hai.
// Isse Vercel build env var missing ho to bhi deployment fail nahi hoti.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/movies`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/reviews`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/community`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/legal`, changeFrequency: 'yearly', priority: 0.2 }
  ];

  try {
    const [titles, reviews] = await Promise.all([
      prisma.title.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true } }),
      prisma.review.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, createdAt: true },
        take: 200,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return [
      ...staticRoutes,
      ...titles.map((t) => ({ url: `${base}/movies/${t.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...reviews.map((r) => ({
        url: `${base}/reviews/${r.id}`,
        lastModified: r.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6
      }))
    ];
  } catch {
    return staticRoutes;
  }
}
