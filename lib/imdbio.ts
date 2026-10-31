import 'server-only';

const base = process.env.IMDBIO_API_URL?.trim().replace(/\/+$/, '');

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // IMDbio returns review text as `plaidHtml`. Render it as plain text rather than
  // trusting external markup inside Cinevood pages.
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function imdbFetch(path: string, revalidate = 900): Promise<unknown | null> {
  if (!base) return null;
  try {
    const token = process.env.IMDBIO_API_TOKEN?.trim();
    const response = await fetch(`${base}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}`, accept: 'application/json' } : { accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate }
    });
    if (!response.ok) {
      console.warn(`[imdbio] ${path} → ${response.status}`);
      return null;
    }
    return await response.json() as unknown;
  } catch (error) {
    console.warn('[imdbio] service unavailable:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

export type ImdbSearchTitle = {
  id: string;
  imdbId: string;
  title: string;
  titleLocalized: string | null;
  coverUrl: string | null;
  url: string | null;
  year: number | null;
  kind: string | null;
  rating: number | null;
};

export type ImdbPerson = {
  name: string;
  pictureUrl: string | null;
  characters: string[];
};

export type ImdbTitle = {
  imdbId: string;
  title: string;
  titleLocalized: string | null;
  kind: string | null;
  coverUrl: string | null;
  plot: string | null;
  summaries: string[];
  year: number | null;
  duration: number | null;
  rating: number | null;
  genres: string[];
  directors: ImdbPerson[];
  stars: ImdbPerson[];
};

export type ImdbReview = {
  spoiler: boolean | null;
  summary: string | null;
  text: string | null;
  authorRating: number | null;
  downVotes: number | null;
  upVotes: number | null;
};

function parseSearchTitle(value: unknown): ImdbSearchTitle | null {
  if (!isObject(value)) return null;
  const rawId = string(value.imdbId);
  const idField = string(value.id);
  const imdbId = rawId && /^tt\d+$/.test(rawId)
    ? rawId
    : idField && /^\d+$/.test(idField)
      ? `tt${idField}`
      : null;
  const title = string(value.title);
  if (!imdbId || !title) return null;
  return {
    id: idField ?? imdbId.slice(2),
    imdbId,
    title,
    titleLocalized: string(value.title_localized),
    coverUrl: string(value.cover_url),
    url: string(value.url),
    year: number(value.year),
    kind: string(value.kind),
    rating: number(value.rating)
  };
}

function parsePerson(value: unknown): ImdbPerson | null {
  if (!isObject(value)) return null;
  const name = string(value.name);
  if (!name) return null;
  const characters = Array.isArray(value.characters)
    ? value.characters.filter((item): item is string => typeof item === 'string')
    : [];
  return { name, pictureUrl: string(value.picture_url), characters };
}

function people(value: unknown): ImdbPerson[] {
  return Array.isArray(value) ? value.map(parsePerson).filter((item): item is ImdbPerson => item !== null) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function searchImdbTitles(query: string): Promise<ImdbSearchTitle[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const data = await imdbFetch(`/search?q=${encodeURIComponent(q)}`, 300);
  if (!isObject(data) || !Array.isArray(data.titles)) return [];
  return data.titles.map(parseSearchTitle).filter((item): item is ImdbSearchTitle => item !== null);
}

export async function getImdbTitle(imdbId: string): Promise<ImdbTitle | null> {
  if (!/^tt\d+$/.test(imdbId)) return null;
  const data = await imdbFetch(`/title/${encodeURIComponent(imdbId)}`, 3600);
  if (!isObject(data)) return null;
  const title = string(data.title);
  const responseId = string(data.imdbId);
  if (!title || (responseId && responseId !== imdbId)) return null;
  return {
    imdbId,
    title,
    titleLocalized: string(data.title_localized),
    kind: string(data.kind),
    coverUrl: string(data.cover_url),
    plot: string(data.plot),
    summaries: strings(data.summaries),
    year: number(data.year),
    duration: number(data.duration),
    rating: number(data.rating),
    genres: strings(data.genres),
    directors: people(data.directors),
    stars: people(data.stars)
  };
}

function normalizeTitle(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
}

/** Match a catalogue's shortened title to a longer official title only after exact matches are exhausted. */
export function imdbTitleNamesMatch(left: string, right: string) {
  const cleanOfficialSuffix = (value: string) => normalizeTitle(value).replace(/\s+part\s+1$/, '').trim();
  const a = cleanOfficialSuffix(left);
  const b = cleanOfficialSuffix(right);
  if (!a || !b) return false;
  if (a === b) return true;
  // Don't collapse sequels/remakes (e.g. "Pushpa" into "Pushpa 2").
  const numberTokens = (value: string) => value.split(' ').filter((token) => /^\d+$/.test(token)).join(' ');
  if (numberTokens(a) !== numberTokens(b)) return false;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  return shorter.length >= 5 && longer.startsWith(`${shorter} `);
}

function mediaKindMatches(kind: string | null, mediaType: 'movie' | 'tv') {
  if (!kind) return true;
  const normalized = kind.toLowerCase();
  return mediaType === 'tv'
    ? normalized === 'tvseries' || normalized === 'tvminiseries'
    : normalized === 'movie' || normalized === 'tvmovie' || normalized === 'short';
}

/** Resolve a catalogue title to IMDbio by saved ID or a conservative title/year/type match. */
export async function getImdbTitleForCatalogue(input: {
  title: string;
  year: number;
  mediaType: 'movie' | 'tv';
  imdbId?: string | null;
}): Promise<ImdbTitle | null> {
  if (input.imdbId) {
    const linked = await getImdbTitle(input.imdbId);
    if (linked) {
      const namesMatch = [linked.title, linked.titleLocalized].some((name) => name && imdbTitleNamesMatch(input.title, name));
      const typeMatches = mediaKindMatches(linked.kind, input.mediaType);
      const yearMatches = !input.year || !linked.year || Math.abs(linked.year - input.year) <= 1;
      if (namesMatch && typeMatches && yearMatches) return linked;
    }
  }
  const query = `${input.title} ${input.year > 0 ? input.year : ''}`.trim();
  const candidates = await searchImdbTitles(query);
  const wanted = normalizeTitle(input.title);
  if (!wanted) return null;
  const titleNames = (candidate: ImdbSearchTitle) => [candidate.title, candidate.titleLocalized].filter((value): value is string => Boolean(value));
  const match = candidates
    .filter((candidate) => mediaKindMatches(candidate.kind, input.mediaType))
    .filter((candidate) => titleNames(candidate).some((name) => imdbTitleNamesMatch(input.title, name)))
    .filter((candidate) => !input.year || !candidate.year || Math.abs(candidate.year - input.year) <= 1)
    .sort((a, b) => {
      const exact = (candidate: ImdbSearchTitle) => Number(titleNames(candidate).some((name) => normalizeTitle(name) === wanted));
      return exact(b) - exact(a) || Number(b.year === input.year) - Number(a.year === input.year);
    })[0];
  return match ? getImdbTitle(match.imdbId) : null;
}

export async function getImdbReviews(imdbId: string): Promise<ImdbReview[]> {
  if (!/^tt\d+$/.test(imdbId)) return [];
  const data = await imdbFetch(`/title/${encodeURIComponent(imdbId)}/reviews`, 1800);
  if (!isObject(data) || !Array.isArray(data.reviews)) return [];
  return data.reviews.filter(isObject).map((review) => ({
    spoiler: typeof review.spoiler === 'boolean' ? review.spoiler : null,
    summary: string(review.summary),
    text: text(review.text),
    authorRating: number(review.authorRating),
    downVotes: number(review.downVotes),
    upVotes: number(review.upVotes)
  }));
}
