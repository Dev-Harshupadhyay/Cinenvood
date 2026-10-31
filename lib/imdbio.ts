import 'server-only';

const base = process.env.IMDBIO_API_URL?.trim().replace(/\/+$/, '');

async function imdbFetch<T>(path: string, revalidate = 900): Promise<T | null> {
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
    return await response.json() as T;
  } catch (error) {
    console.warn('[imdbio] service unavailable:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

export type ImdbSearchTitle = {
  id: string;
  imdb_id: string;
  imdbId: string;
  title: string;
  title_localized?: string;
  cover_url?: string | null;
  url?: string | null;
  year?: number | null;
  kind?: string | null;
  rating?: number | null;
};

export async function searchImdbTitles(query: string) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const data = await imdbFetch<{ titles?: ImdbSearchTitle[] }>(`/search?q=${encodeURIComponent(q)}`, 300);
  return (data?.titles ?? []).filter((item) => /^tt\d+$/.test(item.imdbId || item.id || ''));
}

export async function getImdbTitle(imdbId: string) {
  if (!/^tt\d+$/.test(imdbId)) return null;
  return imdbFetch<Record<string, any>>(`/title/${encodeURIComponent(imdbId)}`, 3600);
}

export async function getImdbReviews(imdbId: string) {
  if (!/^tt\d+$/.test(imdbId)) return [];
  const data = await imdbFetch<{ reviews?: Record<string, any>[] }>(`/title/${encodeURIComponent(imdbId)}/reviews`, 1800);
  return data?.reviews ?? [];
}
