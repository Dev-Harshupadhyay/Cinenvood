import { prisma } from '@/lib/prisma';
import { siteUrl, siteUrlSource } from '@/lib/site';

export type Check = { key: string; label: string; ok: boolean; detail: string };

const ENV_KEYS: [string, string, boolean][] = [
  ['DATABASE_URL', 'Database URL (pooled)', true],
  ['DIRECT_URL', 'Direct DB URL (migrations)', true],
  ['AUTH_SECRET', 'Auth secret', true],
  ['AUTH_TRUST_HOST', 'Auth trust host', true],
  ['NEXT_PUBLIC_SITE_URL', 'Public site URL', false],
  ['ADMIN_EMAIL', 'Admin email', true],
  ['AUTH_GOOGLE_ID', 'Google client id', false],
  ['AUTH_GOOGLE_SECRET', 'Google client secret', false],
  ['TMDB_API_KEY', 'TMDB key', false]
];

export async function runHealth() {
  const checks: Check[] = [];

  for (const [key, label, required] of ENV_KEYS) {
    const present = Boolean(process.env[key]);
    checks.push({
      key,
      label,
      ok: present || !required,
      detail: present ? 'set' : required ? 'missing — required' : 'not set (optional / feature off)'
    });
  }

  // The origin always exists — it just may come from Vercel instead of the dashboard.
  checks.push({
    key: 'site_url',
    label: 'Public origin',
    ok: true,
    detail: `${siteUrl} (from ${siteUrlSource})`
  });

  let dbOk = false;
  let detail = 'not attempted';
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    detail = `connected in ${Date.now() - started}ms`;
  } catch (err) {
    detail = err instanceof Error ? err.message.split('\n')[0].slice(0, 130) : 'unknown error';
  }
  checks.push({ key: 'database', label: 'Postgres connection', ok: dbOk, detail });

  let schemaOk = false;
  let schemaDetail = 'skipped (no connection)';
  let counts = { titles: 0, reviews: 0, users: 0, pageViews: 0 };
  if (dbOk) {
    try {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'cinemood' AND table_name IN ('User','Title','Review','PageView','RateLimit','AdminLog')
      `;
      const found = new Set(rows.map((r) => r.table_name));
      const needed = ['User', 'Title', 'Review', 'PageView', 'RateLimit', 'AdminLog'];
      const missing = needed.filter((t) => !found.has(t));
      schemaOk = missing.length === 0;
      schemaDetail = missing.length ? `missing: ${missing.join(', ')} — run prisma db push` : 'all tables present';

      const cols = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'cinemood' AND table_name = 'Review' AND column_name IN ('bodyEn','editorial','authorName')
      `;
      const colSet = new Set(cols.map((c) => c.column_name));
      if (schemaOk && (!colSet.has('bodyEn') || !colSet.has('editorial') || !colSet.has('authorName'))) {
        schemaOk = false;
        schemaDetail = 'Review table is on an older migration — run prisma db push';
      }

      const [titles, reviews, users, pageViews] = await Promise.all([
        prisma.title.count().catch(() => 0),
        prisma.review.count().catch(() => 0),
        prisma.user.count().catch(() => 0),
        prisma.pageView.count().catch(() => 0)
      ]);
      counts = { titles, reviews, users, pageViews };
    } catch (err) {
      schemaDetail = err instanceof Error ? err.message.split('\n')[0].slice(0, 130) : 'schema check failed';
    }
  }
  checks.push({ key: 'schema', label: 'Database schema', ok: schemaOk, detail: schemaDetail });

  const failed = checks.filter((c) => !c.ok);
  return {
    ok: failed.length === 0,
    checks,
    counts,
    runtime: {
      node: process.version,
      env: process.env.NODE_ENV ?? 'unknown',
      region: process.env.VERCEL_REGION ?? 'local',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'dev',
      url: process.env.VERCEL_URL ?? 'localhost'
    },
    checkedAt: new Date().toISOString()
  };
}
