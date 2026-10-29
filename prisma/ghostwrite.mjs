/**
 * House-style review writer (Hinglish + English in one shot).
 *
 *   node prisma/ghostwrite.mjs --title colony-2026
 *   node prisma/ghostwrite.mjs --title colony-2026 --notes "focus on the high-rise setting"
 *   node prisma/ghostwrite.mjs --title colony-2026 --save        # publishes as an editorial verdict
 *
 * Needs GEMINI_API_KEY in .env (free tier).
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const KEY = (process.env.GEMINI_API_KEY ?? '').trim();
const MODELS = (process.env.GEMINI_MODEL ?? 'gemini-3.5-flash,gemini-flash-lite-latest,gemini-2.5-flash').split(',').map((s) => s.trim());

async function call(prompt, { temperature = 0.75, maxTokens = 3000 } = {}) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      let out = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
      out = out.replace(/^```(?:json|[a-z]*)\s*/i, '').replace(/```$/, '').trim();
      if (out) return out;
    } catch {
      /* next model */
    }
  }
  return null;
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const flag = (name) => process.argv.includes(`--${name}`);

const slug = arg('title');
const notes = arg('notes') ?? '';
const wantSave = flag('save');
const ratingHint = arg('rating') ? Number(arg('rating')) : null;

if (!KEY) {
  console.log('GEMINI_API_KEY missing in .env — get a free key at https://aistudio.google.com/apikey');
  process.exit(0);
}
if (!slug) {
  console.log('Usage: node prisma/ghostwrite.mjs --title <slug> [--notes "…"] [--rating 8] [--save]');
  process.exit(0);
}

const prisma = new PrismaClient();
const film = await prisma.title.findUnique({ where: { slug } });
if (!film) {
  console.log('No title with slug', slug);
  process.exit(1);
}

const samples = await prisma.review.findMany({
  where: { body: { not: '' } },
  orderBy: [{ editorial: 'desc' }, { createdAt: 'desc' }],
  take: 3,
  select: { body: true }
});

const STYLE = readFileSync(new URL('../lib/ghostwrite.ts', import.meta.url), 'utf8');
const rules = STYLE.slice(STYLE.indexOf('const STYLE_RULES = `') + 20, STYLE.indexOf('`;')).trim();

let genre = film.genres;
try { genre = JSON.parse(film.genres).join(', '); } catch {}

const cast = (() => {
  try { return JSON.parse(film.cast ?? '[]').slice(0, 3).map((c) => c.name).join(', '); } catch { return ''; }
})();

const prompt = `You write film reviews for CINE·MOOD in the house author's own voice.

${rules}

STUDY THESE REAL REVIEWS FIRST — match their voice, rhythm and vocabulary:
${samples.map((s, i) => `EXAMPLE ${i + 1}:\n${s.body.slice(0, 1500)}`).join('\n\n')}

FILM: ${film.title} (${film.year})
GENRES: ${genre}
RUNTIME: ${film.runtime ?? '?'} min
DIRECTOR: ${film.director ?? ''}
CAST: ${cast}
IMDB: ${film.imdbRating ?? ''}
SYNOPSIS: ${film.overview ?? ''}

STYLE: compare with another film only when it genuinely fits this film — do not copy the exact
comparison from the examples. Headlines must be complete short thoughts, never ending in "…".

RULES OF TRUTH: never invent director, cast, plot beats, OTT platform or box-office numbers.
Only use what is written in the FILM block above; if a detail is missing, write around it
("the cast", "the setup") instead of guessing a name.

${notes ? `AUTHOR'S NOTES FOR THIS ONE (must be reflected): ${notes}` : ''}
${ratingHint ? `The author wants to give roughly ${ratingHint}/10 — stay consistent.` : ''}

Return STRICT JSON, nothing else:
{
  "rating": <integer 1-10 consistent with the review's tone>,
  "headlineHi": "<short Hinglish headline, max 60 chars>",
  "bodyHi": "<Hinglish review, 4 paragraphs separated by \\n\\n>",
  "headlineEn": "<English headline, max 60 chars>",
  "bodyEn": "<the SAME review in natural English — same opinions, same order>"
}`;

const raw = await call(prompt);
if (!raw) {
  console.log('Gemini did not answer — try again in a few seconds.');
  process.exit(1);
}

const start = raw.indexOf('{');
const draft = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));

console.log('\n' + '═'.repeat(74));
console.log(`${film.title} (${film.year})  ·  ${draft.rating}/10`);
console.log('═'.repeat(74));

console.log('\n── HINGLISH ──────────────────────────────────────────────');
if (draft.headlineHi) console.log('HEADLINE: ' + draft.headlineHi + '\n');
console.log(draft.bodyHi);

console.log('\n\n── ENGLISH ───────────────────────────────────────────────');
if (draft.headlineEn) console.log('HEADLINE: ' + draft.headlineEn + '\n');
console.log(draft.bodyEn);

if (wantSave) {
  const existing = await prisma.review.findFirst({ where: { titleId: film.id, userId: null } });
  const data = {
    rating: draft.rating,
    headline: draft.headlineHi || null,
    body: draft.bodyHi,
    headlineEn: draft.headlineEn || null,
    bodyEn: draft.bodyEn,
    sourceLang: 'hinglish',
    editorial: true,
    status: 'PUBLISHED'
  };
  const row = existing
    ? await prisma.review.update({ where: { id: existing.id }, data })
    : await prisma.review.create({ data: { titleId: film.id, ...data } });
  console.log(`\n✓ saved review ${row.id} → /reviews/${row.id}`);
}

await prisma.$disconnect();
