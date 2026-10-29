/**
 * Enriches every title's cast JSON with TMDB profile photos.
 * Writes prisma/cast-photos.json and (with --apply) updates the database.
 *
 *   node prisma/cast-photos.mjs --fetch   # scrape pages → JSON
 *   node prisma/cast-photos.mjs --apply   # JSON → cinemood."Title".cast
 */
import { Client } from 'pg';
import { readFileSync as rf, existsSync as ex, writeFileSync as wf, mkdirSync as mk } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

if (ex('.env')) {
  for (const line of rf('.env', 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i < 1 || line.trim().startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const mode = process.argv.includes('--apply') ? 'apply' : 'fetch';
const OUT = path.join('prisma', 'cast-photos.json');

const conn = (process.env.DIRECT_URL || process.env.DATABASE_URL || '')
  .replace(/([?&])connection_limit=\d+/, '')
  .replace(/([?&])sslmode=[a-z-]+/i, '');
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

if (mode === 'fetch') {
  const rows = (await client.query('SELECT "tmdbId", title FROM "cinemood"."Title" WHERE "tmdbId" IS NOT NULL ORDER BY "createdAt"')).rows;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
  const out = {};
  console.log(`fetching cast photos for ${rows.length} titles…`);

  const fetchOne = (id) => {
    try {
      return execFileSync('curl', ['-sL', '--max-time', '25', '-A', UA, `https://www.themoviedb.org/movie/${id}`], { maxBuffer: 40 * 1024 * 1024 }).toString();
    } catch { return ''; }
  };

  let done = 0;
  for (const row of rows) {
    const html = fetchOne(row.tmdbId);
    const block = html.match(/<ol class="people scroller">([\s\S]*?)<\/ol>/);
    const people = [];
    if (block) {
      for (const li of block[1].split('<li class="card">').slice(1)) {
        const name = (li.match(/<p><a href="\/person\/[^"]+">([^<]+)<\/a><\/p>/) || li.match(/<a href="\/person\/[^"]+">([^<]+)<\/a>/) || [])[1];
        const role = (li.match(/<p class="character">([^<]*)<\/p>/) || [])[1] || 'Cast';
        const img = (li.match(/(t\/p\/w\d+_and_h\d+_face\/[^" ]+)/) || [])[1];
        if (!name) continue;
        people.push({ name: name.trim(), role: role.trim() || 'Cast', img: img ? `https://image.tmdb.org/${img}` : null });
        if (people.length >= 8) break;
      }
    }
    if (people.length) out[String(row.tmdbId)] = people;
    if (++done % 40 === 0) console.log(`  ${done}/${rows.length}`);
  }
  wf(OUT, JSON.stringify(out, null, 1));
  const withPhoto = Object.values(out).reduce((a, p) => a + p.filter((x) => x.img).length, 0);
  console.log(`· saved ${Object.keys(out).length} titles · ${withPhoto} cast photos`);
}

if (mode === 'apply') {
  if (!ex(OUT)) { console.error('run --fetch first'); process.exit(1); }
  const data = JSON.parse(rf(OUT, 'utf8'));
  let updated = 0;
  for (const [tmdbId, people] of Object.entries(data)) {
    const res = await client.query('UPDATE "cinemood"."Title" SET "cast" = $2::jsonb WHERE "tmdbId" = $1', [Number(tmdbId), JSON.stringify(people)]);
    updated += res.rowCount;
  }
  console.log(`· cast updated for ${updated} titles`);
}

await client.end();
