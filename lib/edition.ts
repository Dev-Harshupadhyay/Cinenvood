import { cookies, headers } from 'next/headers';
import { detectLang, type ReviewLang } from '@/lib/translate';

/**
 * Review edition (language of the review itself, not the UI).
 *
 * Priority:
 *   1. explicit choice — cookie `cm-edition` (en | hi)
 *   2. geo — Vercel sends `x-vercel-ip-country` for free; South Asia → Hinglish
 *   3. Accept-Language — `hi` first → Hinglish, otherwise English
 *
 * International visitors therefore read the English edition by default,
 * Indian visitors read the original Hinglish, and anyone can flip it with one tap.
 *
 * Text resolution (this is what makes a Hinglish review readable by a visitor in
 * London, and an English review readable in Jaipur):
 *
 *   author wrote Hinglish → `body` holds it, `bodyEn` holds the translation
 *   author wrote English  → `body` holds it, `bodyHi` holds the Hinglish version
 *
 * If a translation is missing we fall back to the original rather than showing
 * nothing — a review is never hidden because of its language.
 */
export type Edition = 'en' | 'hi';
export const EDITION_COOKIE = 'cm-edition';

const HINGLISH_COUNTRIES = new Set(['IN', 'NP', 'BD', 'PK', 'LK', 'AE', 'SG', 'MY']);

export async function getEdition(): Promise<Edition> {
  try {
    const jar = await cookies();
    const chosen = jar.get(EDITION_COOKIE)?.value;
    if (chosen === 'en' || chosen === 'hi') return chosen;
  } catch {
    /* not in a request scope */
  }

  try {
    const h = await headers();
    const country = (h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? '').toUpperCase();
    if (country) return HINGLISH_COUNTRIES.has(country) ? 'hi' : 'en';

    const al = (h.get('accept-language') ?? '').toLowerCase();
    if (al.startsWith('hi') || al.includes(',hi')) return 'hi';
    if (al.startsWith('en')) return 'en';
  } catch {
    /* ignore */
  }

  return 'en';
}

type ReviewLike = {
  headline?: string | null;
  body?: string | null;
  headlineEn?: string | null;
  bodyEn?: string | null;
  headlineHi?: string | null;
  bodyHi?: string | null;
  sourceLang?: string | null;
  editorial?: boolean | null;
};

export type EditionedReview = {
  headline: string | null;
  body: string;
  /** true when what you are reading is a translation, not the author's words */
  translated: boolean;
  /** the language the author actually wrote in */
  original: ReviewLang;
  hasEn: boolean;
  hasHi: boolean;
  /** language of the text being shown */
  shown: ReviewLang;
};

export function editionOf(review: ReviewLike, edition: Edition): EditionedReview {
  const body = review.body ?? '';
  const enBody = review.bodyEn?.trim() || null;
  const hiBody = review.bodyHi?.trim() || (body ? body : null);

  const original: ReviewLang = review.sourceLang === 'jarvis-auto'
    ? 'hinglish'
    : (review.sourceLang as ReviewLang | undefined) ?? detectLang(body);

  const hasEn = Boolean(enBody) || original === 'en';
  const hasHi = Boolean(hiBody);

  if (edition === 'en' && original !== 'en') {
    if (enBody) {
      return {
        headline: review.headlineEn?.trim() || review.headline || null,
        body: enBody,
        translated: true,
        original,
        hasEn,
        hasHi,
        shown: 'en'
      };
    }
    return { headline: review.headline ?? null, body, translated: false, original, hasEn, hasHi, shown: original };
  }

  if (edition === 'hi' && original === 'en') {
    if (review.bodyHi?.trim()) {
      return {
        headline: review.headlineHi?.trim() || review.headline || null,
        body: review.bodyHi.trim(),
        translated: true,
        original,
        hasEn,
        hasHi,
        shown: 'hinglish'
      };
    }
    return { headline: review.headline ?? null, body, translated: false, original, hasEn, hasHi, shown: 'en' };
  }

  // same-language edition (or no translation yet) → the author's own words
  return {
    headline: review.headline ?? null,
    body: hiBody ?? body,
    translated: false,
    original,
    hasEn,
    hasHi,
    shown: original
  };
}
