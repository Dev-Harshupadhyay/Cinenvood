/**
 * One-off: legacy imports saved the score inside the headline
 * ("7/10 (Go For It)", "8.5/10 (Perfection / Highly Recommended 🔥)").
 * Scores now live in the verdict band, so headlines get cleaned here too.
 *
 *   node prisma/fix-headlines.mjs          # dry run
 *   node prisma/fix-headlines.mjs --write  # apply
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

// tiny inline .env loader (prisma/*.mjs does not get Next's env)
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const VERDICT_WORDS =
  /(skip|time\s*-?\s*pass|go\s*for\s*it|must\s*watch|masterpiece|perfection|highly\s*recommended|one\s*time\s*watch)/i;

function cleanHeadline(headline) {
  let h = (headline ?? '').trim();
  if (!h) return '';
  h = h.replace(/^\s*\d+(?:\.\d+)?\s*\/\s*10\s*[—–:·-]?\s*/i, '').trim();
  const bracketed = h.match(/^\(([^)]*)\)$/);
  if (bracketed && VERDICT_WORDS.test(bracketed[1])) return '';
  h = h
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/^[—–:·\-()\s]+/, '')
    .replace(/[—–:·\-()\s]+$/, '')
    .trim();
  if (!h || (VERDICT_WORDS.test(h) && h.split(/\s+/).length <= 4)) return '';
  return h;
}

const write = process.argv.includes('--write');
const prisma = new PrismaClient();
const rows = await prisma.review.findMany({ select: { id: true, headline: true, rating: true } });

let changed = 0;
for (const row of rows) {
  const next = cleanHeadline(row.headline);
  if (next === (row.headline ?? '')) continue;
  changed++;
  console.log(`${row.rating}/10  ${JSON.stringify(row.headline)}  ->  ${JSON.stringify(next) || 'null'}`);
  if (write) {
    await prisma.review.update({ where: { id: row.id }, data: { headline: next || null } });
  }
}
console.log(`\n${changed} headline(s) ${write ? 'cleaned' : 'would change'} — run with --write to apply`);
await prisma.$disconnect();
