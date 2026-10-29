import { siteUrl } from '@/lib/site';

/**
 * Google OAuth ki single source of truth.
 *
 * Sirf ID kaafi nahi — Auth.js ko client id **aur** secret dono chahiye.
 * Isliye teen states hain, aur UI har state ka saaf message dikhata hai.
 */
export const googleId = (process.env.AUTH_GOOGLE_ID ?? '').trim();
export const googleSecret = (process.env.AUTH_GOOGLE_SECRET ?? '').trim();

export const googleState: 'off' | 'half' | 'ready' =
  googleId && googleSecret ? 'ready' : googleId || googleSecret ? 'half' : 'off';

export const googleEnabled = googleState === 'ready';

/** Google Cloud Console → Authorized redirect URIs mein yahi paste karna hai. */
export function callbackUrls() {
  const urls = new Set<string>();
  urls.add(`${siteUrl}/api/auth/callback/google`);
  urls.add('http://localhost:3000/api/auth/callback/google');
  urls.add('https://cinenvood.vercel.app/api/auth/callback/google');
  urls.add('https://cinemood.vercel.app/api/auth/callback/google');
  return [...urls];
}

/** Same host, but for the JS origin field (no path). */
export function jsOrigins() {
  return [siteUrl, 'http://localhost:3000', 'https://cinenvood.vercel.app', 'https://cinemood.vercel.app'].filter(
    (v, i, a) => a.indexOf(v) === i
  );
}

/** Pretty client id for logs / status page — never the secret. */
export function maskedId() {
  if (!googleId) return '—';
  const [num, rest] = googleId.split('-');
  return rest ? `${num}-…${rest.slice(-10)}` : `${googleId.slice(0, 8)}…`;
}
