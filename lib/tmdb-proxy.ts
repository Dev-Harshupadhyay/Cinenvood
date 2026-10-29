/**
 * ISP-safe TMDB access.
 *
 * Kai ISPs (India mein common) api.themoviedb.org / image.tmdb.org block karte hain.
 * Yahan sab kuch server-side se jaata hai, aur optional relay bhi hai:
 *
 *   TMDB_PROXY_URL   = "https://my-worker.example.workers.dev"   (Cloudflare Worker / VPS relay)
 *   TMDB_IMG_PROXY   = "https://img.example.workers.dev"          (image relay, optional)
 *
 * Relay hone par request pehle us base par jaati hai:
 *   https://relay/<original-url-without-protocol>
 * Worker sirf proxy karta hai (README mein 12-line worker ka code hai).
 *
 * Browser kabhi bhi TMDB se direct baat nahi karta — posters `/api/img` se aate hain,
 * isliye ISP block hone par bhi UI toota nahi dikhta.
 */

export const TMDB_API = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';

function clean(base: string) {
  return base.replace(/\/+$/, '');
}

function encodeRelay(target: string) {
  return encodeURIComponent(target);
}

/** Original TMDB API url -> network pe use hone wala url (direct ya relayed). */
export function viaProxy(url: string): string {
  const relay = process.env.TMDB_PROXY_URL?.trim();
  if (!relay) return url;
  return `${clean(relay)}/proxy?url=${encodeRelay(url)}`;
}

/** image.tmdb.org path -> humara /api/img route (browser ISP-safe). */
export function imgUrl(path: string | null | undefined, size = 'w500'): string {
  if (!path) return '/posters/placeholder.svg';
  if (path.startsWith('/')) return path; // already local (seed posters)
  const idx = path.indexOf('/t/p/');
  const rel = idx >= 0 ? path.slice(idx + 5) : path; // "w500/xyz.jpg"
  const withSize = rel.startsWith('w') || rel.startsWith('original') ? rel : `${size}/${path.replace(/^\/+/, '')}`;
  return `/api/img?p=${encodeURIComponent(withSize)}`;
}

export async function relayFetch(url: string, init: RequestInit = {}) {
  const target = viaProxy(url);
  return fetch(target, init);
}
