const KEY = process.env.OMDB_API_KEY ?? '';
const BASE = 'https://www.omdbapi.com/';

export function omdbConfigured() {
  return KEY.trim().length > 0;
}

export type OmdbResult = {
  imdbId: string | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  rtRating: number | null;
  metascore: number | null;
};

function num(v: unknown) {
  if (typeof v !== 'string') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function fetchOmdb(q: { imdbId?: string | null; title?: string; year?: number }): Promise<OmdbResult | null> {
  if (!omdbConfigured()) return null;
  const params = new URLSearchParams({ apikey: KEY, plot: 'short' });
  if (q.imdbId) params.set('i', q.imdbId);
  else if (q.title) {
    params.set('t', q.title);
    if (q.year) params.set('y', String(q.year));
  } else return null;

  const res = await fetch(`${BASE}?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const d = (await res.json()) as Record<string, string> & { Ratings?: { Source: string; Value: string }[] };
  if (d.Response === 'False') return null;

  const rt = Array.isArray(d.Ratings) ? d.Ratings.find((r) => r.Source === 'Rotten Tomatoes') : undefined;

  return {
    imdbId: d.imdbID ?? null,
    imdbRating: num(d.imdbRating),
    imdbVotes: d.imdbVotes ? Number(d.imdbVotes.replace(/,/g, '')) || null : null,
    rtRating: rt ? num(rt.Value) : null,
    metascore: num(d.Metascore)
  };
}
