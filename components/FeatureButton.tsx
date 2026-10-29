'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function FeatureButton({ reviewId, on }: { reviewId: string; on: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/feature-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: reviewId, on: !on })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      start(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost rv-feature" data-on={on} onClick={toggle} disabled={busy}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />
        </svg>
        {on ? 'On home' : 'Feature'}
      </button>
      {error ? <span className="rv-feature-err">{error}</span> : null}
    </>
  );
}
