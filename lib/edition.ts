import { cookies, headers } from 'next/headers';

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
  editorial?: boolean | null;
};

export type EditionedReview = {
  headline: string | null;
  body: string;
  /** true when we are showing a translation of the original */
  translated: boolean;
  hasEn: boolean;
  hasHi: boolean;
  original: Edition;
};

/** Pick the right text for this visitor. Community reviews stay as written. */
export function editionOf(review: ReviewLike, edition: Edition): EditionedReview {
  const hiHeadline = review.headline ?? null;
  const hiBody = review.body ?? '';
  const enHeadline = review.headlineEn?.trim() || null;
  const enBody = review.bodyEn?.trim() || null;
  const hasEn = Boolean(enBody);
  const hasHi = Boolean(hiBody);

  if (edition === 'en' && hasEn) {
    return { headline: enHeadline ?? hiHeadline, body: enBody!, translated: true, hasEn, hasHi, original: 'hi' };
  }
  if (edition === 'hi' && hasEn) {
    return { headline: hiHeadline, body: hiBody, translated: false, hasEn, hasHi, original: 'hi' };
  }
  return { headline: hiHeadline, body: hiBody, translated: false, hasEn, hasHi, original: hasEn ? 'hi' : 'hi' };
}
