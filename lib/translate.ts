/**
 * Review translation — Hinglish ⇄ English.
 *
 * Why an LLM and not a normal translate API: Hinglish is Hindi written in Latin
 * letters and mixed with English ("Train to Busan level ki bilkul nahi").
 * Google/MyMemory treat it as English, and transliteration mangles the English
 * words ("decent lagi" → "डेन्ट लगी" → "I got a dent"). Only an LLM reads the mix
 * properly.
 *
 * Provider: Google AI Studio free tier (GEMINI_API_KEY). No key → every function
 * here quietly returns `null`, and the site keeps showing the original text.
 */

export type ReviewLang = 'hinglish' | 'hindi' | 'en';

const MODELS = (process.env.GEMINI_MODEL ?? 'gemini-3.5-flash,gemini-flash-lite-latest,gemini-2.5-flash')
  .split(',')
  .map((m) => m.trim())
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Rough language of a review — Devanagari is obvious, Hinglish needs markers. */
export function detectLang(text: string): ReviewLang {
  const t = (text ?? '').trim();
  if (!t) return 'hinglish';
  if (/[\u0900-\u097F]/.test(t)) return 'hindi';

  const words = t.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  const markers = new Set([
    'hai', 'hai.', 'nahi', 'nahin', 'kya', 'aur', 'mujhe', 'mera', 'meri', 'mujhko', 'tha', 'thi', 'the',
    'bhai', 'yaar', 'bahut', 'bohot', 'accha', 'achha', 'badiya', 'bakwas', 'mast', 'laga', 'lagi', 'lage',
    'kyun', 'kyu', 'toh', 'par', 'lekin', 'abhi', 'phir', 'zabardast', 'bekar', 'matlab', 'kuch', 'log',
    'dekh', 'dekho', 'dekhne', 'ki', 'ka', 'ke', 'ko', 'se', 'ek', 'do', 'kar', 'karta', 'karti', 'hota',
    'hoti', 'kamaal', 'bekaar', 'shandar', 'paise', 'paisa', 'vasool'
  ]);
  const hits = words.filter((w) => markers.has(w)).length;
  // 2+ Hindi markers in a mostly-Latin text → treat it as Hinglish
  return hits >= 2 ? 'hinglish' : 'en';
}

/**
 * One call, with a small model chain so a single retired/quota-limited model
 * never takes the feature down.
 */
export async function callGemini(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {}
): Promise<string | null> {
  const key = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!key) return null;

  for (const model of MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.35,
            maxOutputTokens: opts.maxTokens ?? 1400,
            topP: 0.95,
            ...(opts.json ? { responseMimeType: 'application/json' } : {})
          }
        })
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      let out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      out = out.trim().replace(/^```(?:json|[a-z]*)\s*/i, '').replace(/```$/, '').trim();
      if (out) return out;
    } catch {
      /* try the next model */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const EN_PROMPT = (text: string) => `You translate Indian film reviews into English.

Rules:
- The text may mix romanised Hindi (Hinglish) with English. Translate the Hindi parts, keep the English parts.
- Keep film and actor names exactly as written. Keep the tone — it is a movie fan talking, not a critic.
- Keep paragraph breaks. Do not add a title, notes or quotation marks.
- Output ONLY the English text.

Review:
${text}`;

const HI_PROMPT = (text: string) => `You rewrite English film reviews in Hinglish (romanised Hindi mixed with English, the way Indian film fans write on the internet).

Rules:
- Natural Hinglish, not formal Hindi. Keep common English words as they are (story, cast, screenplay, VFX…).
- Keep film and actor names exactly. Keep paragraph breaks. Do not add a title or notes.
- Output ONLY the Hinglish text.

Review:
${text}`;

/** Translate a review body + headline to the target language. */
export async function translateReview(input: {
  headline?: string | null;
  body: string;
  target: 'en' | 'hinglish';
}): Promise<{ headline: string | null; body: string } | null> {
  const { headline, body, target } = input;
  if (!body.trim()) return null;

  const prompt = target === 'en' ? EN_PROMPT(body) : HI_PROMPT(body);
  const translated = await callGemini(prompt);
  if (!translated) return null;

  let translatedHeadline: string | null = null;
  const h = (headline ?? '').trim();
  if (h) {
    const hp = await callGemini(
      target === 'en'
        ? `Translate this Hinglish film-review headline into natural English. Output only the headline.\n\n${h}`
        : `Rewrite this English film-review headline in natural Hinglish. Output only the headline.\n\n${h}`
    );
    translatedHeadline = hp ? hp.replace(/^["“]|["”]$/g, '').trim().slice(0, 140) : null;
  }

  return { headline: translatedHeadline, body: translated.slice(0, 8000) };
}

/** True when we can translate at all — the UI can stay honest about it. */
export const translationEnabled = Boolean((process.env.GEMINI_API_KEY ?? '').trim());
