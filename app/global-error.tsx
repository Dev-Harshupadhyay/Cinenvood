'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" data-theme="dark">
      <body style={{ background: '#0B0D0C', color: '#F2F4F1', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ maxWidth: 560, margin: '12vh auto', padding: 24 }}>
          <p style={{ letterSpacing: '0.18em', fontSize: 11, color: '#18B981', textTransform: 'uppercase' }}>CINE·MOOD</p>
          <h1 style={{ fontSize: 28, margin: '10px 0 8px' }}>Root layout failed</h1>
          <p style={{ color: '#9BA69D', lineHeight: 1.7 }}>
            Server-side exception. Check <code>/api/health</code> for environment and database status.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: '10px 18px', borderRadius: 999, border: 0, background: '#18B981', color: '#04110B', fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
          {error.digest ? <p style={{ color: '#5D6A61', fontSize: 11, marginTop: 18 }}>digest: {error.digest}</p> : null}
        </div>
      </body>
    </html>
  );
}
