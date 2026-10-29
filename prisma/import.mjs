/**
 * CINE·MOOD — catalogue + legacy import
 * ------------------------------------------------------------------
 * 1. Wipes every demo/seed row from the `cinemood` schema (no fake users).
 * 2. Imports the real catalogue (TMDB metadata: posters, backdrops, cast).
 * 3. Brings over the 9 legacy "CiNEMAsFLiX" reviews as EDITORIAL reviews,
 *    credited to the site — not to a fabricated account.
 *
 * Legacy tables in `public.*` are never touched.
 *
 *   node prisma/import.mjs            # full reset + import
 *   node prisma/import.mjs --keep     # import on top of existing row
 */
import { Client } from 'pg';
import { readFileSync as __rf, existsSync as __ex } from 'node:fs';
// minimal .env loader — these scripts run outside next
if (__ex('.env')) {
  for (const line of __rf('.env', 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i < 1 || line.trim().startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

const raw = fs.existsSync(path.join(__dirname, 'catalogue-raw.json')) ? read('catalogue-raw.json') : [];
const legacy = fs.existsSync(path.join(__dirname, 'legacy-raw.json')) ? read('legacy-raw.json') : { admin: [] };
const editions = fs.existsSync(path.join(__dirname, 'legacy-en.json')) ? read('legacy-en.json') : {};
const castPhotos = fs.existsSync(path.join(__dirname, 'cast-photos.json')) ? read('cast-photos.json') : {};

const conn =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres.janmyjspktvqdoeatpxo:5QA2FFrba1jq7pvC@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=cinemood';

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

/* ── 1. Build the catalogue ─────────────────────────────────────────── */
const FLAGSHIP = new Set(['687163', '969681', '1081003', '1375646', '1213243']);

const byTmdb = new Map();
const push = (t) => {
  if (!t.tmdbId || !t.title || !t.poster || !t.year) return;
  if (t.year > 2027 || t.year < 1940) return;
  const genres = (t.genres || []).filter((g) => g !== 'TV Movie');
  if (!genres.length) genres.push('Drama');
  if (byTmdb.has(t.tmdbId)) return; // legacy rows win — they're first
  byTmdb.set(t.tmdbId, {
    tmdbId: t.tmdbId,
    title: t.title.trim(),
    year: t.year,
    runtime: t.runtime || 100,
    overview: (t.overview || 'Details coming soon.').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
    poster: t.poster,
    backdrop: t.backdrop || t.poster,
    genres: JSON.stringify(genres),
    director: t.director || null,
    cast: JSON.stringify((t.cast || []).slice(0, 6)),
    tmdbScore: t.tmdbScore ? Math.round(t.tmdbScore) / 10 : null,
    featured: FLAGSHIP.has(String(t.tmdbId))
  });
};

// legacy titles first (most accurate, already have backdrop + cast)
legacy.admin.forEach((r) => push({ ...r, tmdbScore: r.rating ? r.rating * 10 : null }));
// then the scraped TMDB catalogue
raw.forEach((t) => push(t));

const titles = [...byTmdb.values()];
const usedSlugs = new Set();
titles.forEach((t) => {
  let base = slugify(`${t.title}-${t.year}`);
  if (!base) base = `title-${t.tmdbId}`;
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
  usedSlugs.add(slug);
  t.slug = slug;
  t.id = randomUUID();
});
const idByTmdb = new Map(titles.map((t) => [String(t.tmdbId), t.id]));

/* ── 2. Connect ─────────────────────────────────────────────────────── */
const client = new Client({
  connectionString: conn.replace(/([?&])connection_limit=\d+/, ''),
  ssl: { rejectUnauthorized: false }
});
await client.connect();

const keep = process.argv.includes('--keep');
if (!keep) {
  await client.query(`
    TRUNCATE TABLE
      "cinemood"."Comment",
      "cinemood"."ReviewLike",
      "cinemood"."TitleLike",
      "cinemood"."Review",
      "cinemood"."Title",
      "cinemood"."User"
    RESTART IDENTITY CASCADE;
  `);
  console.log('· demo rows cleared (users, titles, reviews, likes, comments)');
}

/* ── 3. Titles ──────────────────────────────────────────────────────── */
const COLS = ['id', 'slug', 'tmdbId', 'title', 'year', 'runtime', 'overview', 'poster', 'backdrop', 'genres', 'director', 'cast', 'tmdbScore', 'featured', 'status'];
const BATCH = 40;
for (let i = 0; i < titles.length; i += BATCH) {
  const chunk = titles.slice(i, i + BATCH);
  const values = [];
  const params = [];
  chunk.forEach((t, row) => {
    const p = (n) => `$${row * 14 + n}`;
    values.push(
      `(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)},${p(10)}::jsonb,${p(11)},${p(12)}::jsonb,${p(13)},${p(14)},'PUBLISHED'::"cinemood"."TitleStatus")`
    );
    params.push(t.id, t.slug, t.tmdbId, t.title, t.year, t.runtime, t.overview, t.poster, t.backdrop, t.genres, t.director, t.cast, t.tmdbScore, t.featured);
  });
  await client.query(
    `INSERT INTO "cinemood"."Title" (${COLS.map((c) => `"${c}"`).join(',')}) VALUES ${values.join(',')}
     ON CONFLICT ("tmdbId") DO NOTHING`,
    params
  );
}
console.log(`· ${titles.length} titles in catalogue`);

/* ── 4. Legacy editorial reviews ────────────────────────────────────── */
let imported = 0;
for (const r of legacy.admin) {
  const titleId = idByTmdb.get(String(r.tmdbId));
  if (!titleId) continue;
  const rating = Math.max(1, Math.min(10, Math.round(Number(r.rating) || 7)));
  const headline = (r.verdict || `${rating}/10 — ${r.title}`)
    .replace(/^My Rating[^:]*:\s*/i, '')
    .replace(/[✦✨⭐]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || `${rating}/10 — ${r.title}`;
  const cleanBody = String(r.body || '')
    .split('\n')
    .filter((line, i) => !(i === 0 && /review\s*$/i.test(line) && line.length < 80))
    .join('\n')
    .trim();
  if (cleanBody.length < 20) continue;
  const edition = editions[String(r.tmdbId)] ?? {};
  await client.query(
    `INSERT INTO "cinemood"."Review" (id, rating, headline, body, "headlineEn", "bodyEn", spoiler, featured, status, "createdAt", "updatedAt", "authorName", editorial, "titleId")
     VALUES ($1,$2,$3,$4,$5,$6,false,$7,'PUBLISHED'::"cinemood"."ReviewStatus",$8,now(),$9,true,$10)`,
    [randomUUID(), rating, headline, cleanBody, edition.headlineEn ?? null, edition.bodyEn ?? null, FLAGSHIP.has(String(r.tmdbId)), new Date(r.createdAt || Date.now()), 'CiNEMAsFLiX', titleId]
  );
  imported++;
}
console.log(`· ${imported} legacy editorial reviews imported (Hinglish + English edition)`);

// cast photos (optional file produced by prisma/cast-photos.mjs)
let castUpdated = 0;
for (const [tmdbId, people] of Object.entries(castPhotos)) {
  const res = await client.query('UPDATE "cinemood"."Title" SET "cast" = $2::jsonb WHERE "tmdbId" = $1', [Number(tmdbId), JSON.stringify(people)]);
  castUpdated += res.rowCount;
}
if (castUpdated) console.log(`· cast photos applied to ${castUpdated} titles`);

const q = async (sql) => (await client.query(sql)).rows;
const counts = (
  await q(`SELECT
    (SELECT count(*) FROM "cinemood"."Title") titles,
    (SELECT count(*) FROM "cinemood"."Review") reviews,
    (SELECT count(*) FROM "cinemood"."User") users,
    (SELECT count(*) FROM "cinemood"."Comment") comments`)
)[0];
console.log('· final:', counts);
await client.end();
