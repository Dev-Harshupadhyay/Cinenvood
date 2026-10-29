'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="container auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">500 · something broke</div>
        <h1 style={{ fontSize: 30 }}>Ye page load nahi ho paya</h1>
        <p className="auth-sub">
          Server par ek exception aaya. Neeche diagnostics kholo — wahan pata chal jayega ki database, env var ya
          schema ka issue hai.
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
          <button type="button" onClick={reset} className="btn btn-primary btn-block">
            Retry
          </button>
          <Link href="/status" className="btn btn-ghost btn-block">
            Open diagnostics
          </Link>
          <Link href="/" className="btn btn-ghost btn-block">
            Back home
          </Link>
        </div>
        {error.digest ? (
          <p className="form-note mono" style={{ marginTop: 14, fontSize: 10 }}>
            digest: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
