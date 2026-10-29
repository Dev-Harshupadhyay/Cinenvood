/**
 * Adds the English edition to the imported legacy reviews and tidies the
 * Hinglish body (drops the duplicated "🎬 TITLE (2026) - Review" first line).
 *
 *   node prisma/apply-en.mjs
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-en.json'), 'utf8'));
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-raw.json'), 'utf8'));

const conn = (process.env.DIRECT_URL || process.env.DATABASE_URL || '')
  .replace(/([?&])connection_limit=\d+/, '')
  .replace(/([?&])sslmode=[a-z-]+/i, '');
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

const stripTitleLine = (body) => {
  const lines = String(body).split('\n');
  while (lines.length && (!lines[0].trim() || /review\s*$/i.test(lines[0]) && lines[0].length < 80 && /\(\d{4}\)/.test(lines[0]))) {
    lines.shift();
  }
  return lines.join('\n').trim();
};

let updated = 0;
for (const a of raw.admin) {
  const t = await client.query('SELECT id FROM "cinemood"."Title" WHERE "tmdbId" = $1', [Number(a.tmdbId)]);
  if (!t.rows.length) continue;
  const r = await client.query(
    'SELECT id, body FROM "cinemood"."Review" WHERE "titleId" = $1 AND editorial = true ORDER BY "createdAt" DESC LIMIT 1',
    [t.rows[0].id]
  );
  if (!r.rows.length) continue;
  const edition = en[String(a.tmdbId)];
  const cleanBody = stripTitleLine(r.rows[0].body);
  await client.query(
    'UPDATE "cinemood"."Review" SET "body" = $2, "headlineEn" = $3, "bodyEn" = $4, "updatedAt" = now() WHERE id = $1',
    [r.rows[0].id, cleanBody, edition?.headlineEn ?? null, edition?.bodyEn ?? null]
  );
  updated++;
}
const check = await client.query('SELECT count(*)::int n FROM "cinemood"."Review" WHERE "bodyEn" IS NOT NULL');
console.log(`· ${updated} reviews updated · ${check.rows[0].n} with English edition`);
await client.end();
