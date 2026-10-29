export function parseList<T = string>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function timeAgo(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  const steps: [number, string][] = [
    [60, 's'],
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.35, 'w'],
    [12, 'mo']
  ];
  let value = secs;
  let unit = 's';
  for (const [size, label] of steps) {
    if (value < size) {
      unit = label;
      break;
    }
    value = Math.floor(value / size);
    unit = label;
  }
  return `${value}${unit} ago`;
}

export function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

export function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 62% 42%), hsl(${(hash + 48) % 360} 68% 28%))`;
}

export function scoreTone(score: number) {
  if (score >= 8.5) return 'elite';
  if (score >= 7.5) return 'great';
  if (score >= 6.5) return 'good';
  return 'mixed';
}

export function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Public byline for a review.
 *
 * Google se aaya naam sabse pehle; agar user ne naam set nahi kiya to email se
 * ek readable naam bana lete hain ("rahul.sharma@…" → "Rahul Sharma"). Kuch bhi
 * na mile to "CineMood Member" — card kabhi khaali byline nahi dikhata.
 */
export function displayName(name?: string | null, email?: string | null): string {
  const clean = (name ?? '').trim();
  if (clean) return clean;

  const local = (email ?? '').split('@')[0] ?? '';
  const pretty = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return pretty || 'CineMood Member';
}

/** True when the byline was derived (user never set a display name). */
export function hasOwnName(name?: string | null): boolean {
  return Boolean((name ?? '').trim());
}

/** Byline used everywhere a review is shown. Admin/editorial kabhi khaali nahi. */
export function reviewByline(r: {
  editorial?: boolean | null;
  authorName?: string | null;
  user?: { name?: string | null; email?: string | null; role?: string | null } | null;
}): string {
  const role = r.user?.role ?? 'USER';
  const isSiteVoice = Boolean(r.editorial) || role === 'ADMIN';
  const own = (r.authorName ?? '').trim() || (r.user?.name ?? '').trim();
  if (isSiteVoice) return own || 'Admin';
  return displayName(r.user?.name, r.user?.email);
}

/**
 * Google serves avatars at tiny sizes (`=s96-c`). Ask for a slightly bigger one so
 * faces stay sharp at 84px, and leave every other URL untouched.
 */
export function avatarSrc(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('googleusercontent.com')) return url.replace(/=s\d+(-c)?$/, '=s256-c');
  return url;
}

/**
 * Legacy imports saved the score as the headline ("7/10 (Go For It)", "9/10 (Must Watch) 🔥").
 * The site now shows scores in the verdict band, so a headline should only ever be words.
 */
const VERDICT_WORDS =
  /(skip|time\s*-?\s*pass|go\s*for\s*it|must\s*watch|masterpiece|perfection|highly\s*recommended|one\s*time\s*watch)/i;

export function cleanHeadline(headline?: string | null): string {
  let h = (headline ?? '').trim();
  if (!h) return '';

  // leading "7/10", "8.5/10", "3/10(SKIP)" + any separator
  h = h.replace(/^\s*\d+(?:\.\d+)?\s*\/\s*10\s*[—–:·\-]?\s*/i, '').trim();

  // what is left is the verdict restated in brackets, e.g. "(Timepass 🍿)"
  const bracketed = h.match(/^\(([^)]*)\)$/);
  if (bracketed && VERDICT_WORDS.test(bracketed[1])) return '';

  // strip emoji + dangling separators
  h = h
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/^[—–:·\-()\s]+/, '')
    .replace(/[—–:·\-()\s]+$/, '')
    .trim();

  // if all that survives is a verdict word, there is no real headline
  if (!h || VERDICT_WORDS.test(h) && h.split(/\s+/).length <= 4) return '';

  return h;
}
