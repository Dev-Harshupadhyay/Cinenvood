/**
 * Fills in the missing edition for every review that does not have one yet.
 *
 *   node prisma/translate-reviews.mjs           # dry run — shows what would change
 *   node prisma/translate-reviews.mjs --write   # translates + saves
 *
 * Needs GEMINI_API_KEY (free tier: https://aistudio.google.com/apikey).
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const { detectLang, translateReview, translationEnabled } = await import('../lib/translate.mjs').catch(() => ({}));

// lib/translate.ts is TypeScript — duplicate the two bits we need here so this
// script runs with plain node.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
async function call(prompt) {
  const key = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1200 }
      })
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  let out = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  out = out.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim();
  return out || null;
}
const MARKERS = new Set('hai nahi kya aur mujhe mera meri tha thi bhai yaar bahut accha achha badiya bakwas mast laga lagi lage kyun kyu toh par lekin abhi phir kuch dekh dekho dekhne ki ka ke ko se ek kar karta karti hota hoti kamaal shandar paisa vasool'.split(' '));
function detectLang(text) {
  const t = (text ?? '').trim();
  if (/[\u0900-\u097F]/.test(t)) return 'hindi';
  const words = t.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  return words.filter((w) => MARKERS.has(w)).length >= 2 ? 'hinglish' : 'en';
}

if (!translationEnabled && !process.env.GEMINI_API_KEY) {
  console.log('GEMINI_API_KEY missing — nothing to do. Get a free key: https://aistudio.google.com/apikey');
  process.exit(0);
}

const write = process.argv.includes('--write');
const prisma = new PrismaClient();
const rows = await prisma.review.findMany({
  select: { id: true, rating: true, headline: true, body: true, bodyEn: true, bodyHi: true, sourceLang: true, title: { select: { title: true } } }
});

let done = 0;
for (const row of rows) {
  const source = row.sourceLang ?? detectLang(`${row.headline ?? ''} ${row.body}`);
  const needsEn = source !== 'en' && !row.bodyEn?.trim();
  const needsHi = source === 'en' && !row.bodyHi?.trim();
  if (!needsEn && !needsHi) continue;

  const target = needsEn ? 'en' : 'hinglish';
  console.log(`${row.title.title} · ${row.rating}/10 · ${source} → ${target}`);
  if (!write) continue;

  const prompt =
    target === 'en'
      ? `Translate this Indian film review into English. It may mix romanised Hindi (Hinglish) with English — translate the Hindi, keep the English, keep film/actor names. Keep paragraph breaks. Output only the translation.\n\n${row.body}`
      : `Rewrite this English film review in natural Hinglish (romanised Hindi mixed with English, the way Indian film fans write). Keep film names, keep paragraph breaks. Output only the text.\n\n${row.body}`;

  const out = await call(prompt);
  if (!out) {
    console.log('   ✗ translation failed');
    continue;
  }

  await prisma.review.update({
    where: { id: row.id },
    data:
      target === 'en'
        ? { bodyEn: out, sourceLang: source }
        : { bodyHi: out, sourceLang: source }
  });
  done++;
  console.log('   ✓ saved');
}

console.log(`\n${write ? `translated ${done} review(s)` : 'dry run — add --write to translate'}`);
await prisma.$disconnect();
