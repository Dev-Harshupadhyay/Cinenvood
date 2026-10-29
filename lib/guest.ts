'use client';

/**
 * Guest identity — lives only in localStorage, never on the server as a user.
 * It lets a signed-out visitor keep a stable read-only session (theme, language,
 * "seen this already" state, anonymous analytics) without creating an account.
 */
const KEY = 'cm-guest-id';

export function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      const rand =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
          : Math.random().toString(36).slice(2, 14);
      id = `g_${rand}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function getGuestMeta(): { id: string; firstSeen: string; visits: number } {
  if (typeof window === 'undefined') return { id: '', firstSeen: '', visits: 0 };
  const id = getGuestId();
  try {
    const first = window.localStorage.getItem('cm-guest-first') ?? new Date().toISOString();
    window.localStorage.setItem('cm-guest-first', first);
    const visits = Number(window.localStorage.getItem('cm-guest-visits') ?? '0') + 1;
    window.localStorage.setItem('cm-guest-visits', String(visits));
    return { id, firstSeen: first, visits };
  } catch {
    return { id, firstSeen: '', visits: 0 };
  }
}
