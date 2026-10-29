'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getGuestId } from '@/lib/guest';

/**
 * First-party page view beacon. No cookies, no third-party scripts:
 * a hashed guest/user id + path + referrer is all that leaves the page.
 */
export default function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    const device = window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer ? new URL(document.referrer).hostname : null,
      device,
      lang: document.documentElement.lang || 'en',
      guestId: getGuestId()
    });
    const url = '/api/track';
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      else fetch(url, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } });
    } catch {
      /* analytics must never break the page */
    }
  }, [pathname]);

  return null;
}
