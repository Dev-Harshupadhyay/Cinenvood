import { callGemini, translationEnabled } from '@/lib/translate';
import { verdictFor } from '@/lib/verdict';

/**
 * House ghostwriter.
 *
 * The site's voice is not generic critic prose — it is Harsh writing as a film fan:
 *   • opens with the verdict ("mujhe decent lagi, but Train to Busan level ki bilkul nahi")
 *   • what worked → what didn't → "Overall, agar tum … pasand karte ho to"
 *   • English film vocabulary inside Hinglish (screenplay, atmosphere, character depth)
 *   • short paragraphs, first person, compares with other films
 *
 * This module feeds real past reviews to the model as few-shot examples and asks for
 * BOTH editions in one call so the English and Hinglish read like the same person.
 */

export type GhostDraft = {
  rating: number;
  headlineHi: string;
  bodyHi: string;
  headlineEn: string;
  bodyEn: string;
};

const STYLE_RULES = `
HOW THIS WRITER WRITES (follow it closely, it is not a generic review):
- First person, casual Hinglish — "mujhe … lagi", "bhai", "yaar", "dekhne ke baad". No fake formality, no "as an AI".
- Paragraph 1: the verdict in one honest line, often compared to another film ("Train to Busan level ki bilkul nahi").
- Paragraph 2: what actually worked — atmosphere, screenplay, cast, action, production. Be specific, not listy.
- Paragraph 3: what didn't — name the exact weakness (writing, depth, pacing, CGI, predictable twists).
- Closing: "Overall, agar tum … pasand karte ho to ek baar try kar sakte ho" style recommendation tied to taste.
- 4 short paragraphs, 320–480 words total. Plain text, no markdown, no bullet lists, no headings.
- Film/actor names stay in English. English film vocabulary inside Hinglish is normal.
- At most one emoji, and only if the reaction is strong.
- Honest, never promotional. If the film is weak, say so.
- Compare with another film only when the comparison genuinely fits THIS film. Never reuse the exact comparison line from the examples ("Train to Busan level ki bilkul nahi") unless the film really is that kind of genre-mate.
- Headlines are complete short thoughts — never end with "…".
- NEVER invent facts. Director, cast, plot, platform and box-office details must come only from the FILM block above. If something is missing, write around it ("the cast", "the setup") instead of guessing.
`;

function profileBlock(t: {
  title: string;
  year: number;
  genres: string;
  overview?: string | null;
  runtime?: number | null;
  director?: string | null;
  cast?: string | null;
  imdbRating?: number | null;
}) {
  const genres = (() => {
    try {
      return (JSON.parse(t.genres) as string[]).join(', ');
    } catch {
      return t.genres;
    }
  })();
  return [
    `FILM: ${t.title} (${t.year})`,
    genres ? `GENRES: ${genres}` : '',
    t.runtime ? `RUNTIME: ${t.runtime} min` : '',
    t.director ? `DIRECTOR: ${t.director}` : '',
    t.cast ? `CAST: ${t.cast}` : '',
    t.imdbRating ? `IMDB: ${t.imdbRating}` : '',
    t.overview ? `SYNOPSIS: ${t.overview}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

export async function ghostwrite(input: {
  film: Parameters<typeof profileBlock>[0];
  samples: { text: string }[];
  notes?: string;
  ratingHint?: number | null;
}): Promise<GhostDraft | null> {
  if (!translationEnabled) return null;

  const examples = input.samples
    .slice(0, 3)
    .map((s, i) => `EXAMPLE ${i + 1} (written by the house author):\n${s.text.slice(0, 1500)}`)
    .join('\n\n');

  const prompt = `You write film reviews for CINE·MOOD in the house author's own voice.

${STYLE_RULES}

STUDY THESE REAL REVIEWS FIRST — match their voice, rhythm and vocabulary:
${examples}

${profileBlock(input.film)}

${input.notes ? `AUTHOR'S NOTES FOR THIS ONE (must be reflected): ${input.notes}` : ''}
${input.ratingHint ? `The author wants to give roughly ${input.ratingHint}/10 — stay consistent with that.` : ''}

Return STRICT JSON, nothing else:
{
  "rating": <integer 1-10 consistent with the review's tone>,
  "headlineHi": "<short Hinglish headline, max 60 chars, may be empty>",
  "bodyHi": "<the Hinglish review, 4 paragraphs separated by \\n\\n>",
  "headlineEn": "<English headline, max 60 chars>",
  "bodyEn": "<the SAME review in natural English — same opinions, same paragraph structure, same order>"
}`;

  const raw = await callGemini(prompt, { temperature: 0.75, maxTokens: 3000, json: true });
  if (!raw) return null;

  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<GhostDraft>;
    if (!parsed.bodyHi || !parsed.bodyEn) return null;
    const rating = Math.min(10, Math.max(1, Math.round(Number(parsed.rating) || input.ratingHint || 7)));
    return {
      rating,
      headlineHi: (parsed.headlineHi ?? '').trim().slice(0, 90),
      bodyHi: parsed.bodyHi.trim(),
      headlineEn: (parsed.headlineEn ?? '').trim().slice(0, 90),
      bodyEn: parsed.bodyEn.trim()
    };
  } catch {
    return null;
  }
}

/** The rating word, so a draft can be sanity-checked against the site's bands. */
export function draftBand(rating: number) {
  return verdictFor(rating);
}
