/**
 * One source of truth for the public origin.
 *
 * Order: explicit env → Vercel's own production URL → deployment URL → localhost.
 * This means the site still emits correct canonical/OG/sitemap URLs even when
 * NEXT_PUBLIC_SITE_URL hasn't been added in the dashboard yet.
 */
function withProtocol(host?: string | null) {
  if (!host) return null;
  return host.startsWith('http') ? host : `https://${host}`;
}

export const siteUrl =
  withProtocol(process.env.NEXT_PUBLIC_SITE_URL) ??
  withProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  withProtocol(process.env.VERCEL_URL) ??
  'http://localhost:3000';

export const siteUrlSource = process.env.NEXT_PUBLIC_SITE_URL
  ? 'NEXT_PUBLIC_SITE_URL'
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? 'VERCEL_PROJECT_PRODUCTION_URL'
    : process.env.VERCEL_URL
      ? 'VERCEL_URL'
      : 'localhost';
