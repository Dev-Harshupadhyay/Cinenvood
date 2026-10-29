import { runHealth } from '@/lib/health';
import { callbackUrls, googleEnabled, googleState, jsOrigins, maskedId } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diagnostics', robots: { index: false, follow: false } };

export default async function StatusPage() {
  const health = await runHealth();

  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 40 }}>
      <div className="eyebrow">Diagnostics</div>
      <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', marginBottom: 6 }}>
        {health.ok ? 'Sab theek hai ✅' : 'Kuch setup baaki hai ⚠️'}
      </h1>
      <p className="sub" style={{ marginBottom: 20 }}>
        Ye page deployment ki health dikhata hai — env vars, database connection, schema aur data counts.
        Isko kisi ko share karne ki zaroorat nahi, sirf debug ke liye hai.
      </p>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          ['Titles', health.counts.titles],
          ['Reviews', health.counts.reviews],
          ['Users', health.counts.users],
          ['Page views', health.counts.pageViews]
        ].map(([l, v]) => (
          <div key={l as string} className="stat-card">
            <div className="sl">{l}</div>
            <div className="sv">{v as number}</div>
            <div className="sd">rows</div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-title"><span>Checks</span></div>
        <div className="t-scroll">
          <table className="table">
            <thead><tr><th>Check</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {health.checks.map((c) => (
                <tr key={c.key}>
                  <td className="t-title">{c.label}</td>
                  <td>
                    <span className={`status ${c.ok ? 'status-published' : 'status-pending'}`}>{c.ok ? 'OK' : 'FAIL'}</span>
                  </td>
                  <td className="mono t-sub">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-title">
          <span>Google sign-in</span>
          <span className="faint mono" style={{ fontSize: 10 }}>
            {googleState === 'ready' ? 'LIVE' : googleState === 'half' ? 'ID SET · SECRET MISSING' : 'OFF'}
          </span>
        </div>
        <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
          <div className="mono">client id: {maskedId()}</div>
          {!googleEnabled ? (
            <p className="form-note" style={{ margin: 0 }}>
              Client ID set hai{googleState === 'half' ? '' : ' nahi'}; <code className="mono">AUTH_GOOGLE_SECRET</code>{' '}
              Vercel → Settings → Environment Variables mein daalo, phir Redeploy.
            </p>
          ) : null}
          <div>
            <div className="faint mono" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 6 }}>
              GOOGLE CLOUD → AUTHORIZED REDIRECT URI
            </div>
            {callbackUrls().map((u) => (
              <div key={u} className="mono" style={{ fontSize: 12, padding: '3px 0', overflowWrap: 'anywhere' }}>
                {u}
              </div>
            ))}
          </div>
          <div>
            <div className="faint mono" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 6 }}>
              AUTHORIZED JAVASCRIPT ORIGIN
            </div>
            {jsOrigins().map((u) => (
              <div key={u} className="mono" style={{ fontSize: 12, padding: '3px 0', overflowWrap: 'anywhere' }}>
                {u}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title"><span>Runtime</span></div>
        <div style={{ display: 'grid', gap: 8, fontSize: 13 }} className="mono">
          <div>node: {health.runtime.node}</div>
          <div>env: {health.runtime.env}</div>
          <div>region: {health.runtime.region}</div>
          <div>commit: {health.runtime.commit}</div>
          <div>host: {health.runtime.url}</div>
          <div>checked: {health.checkedAt}</div>
        </div>
      </div>

      <p className="form-note" style={{ marginTop: 16 }}>
        Machine-readable: <a href="/api/health" style={{ color: 'var(--accent)' }}>/api/health</a>
      </p>
    </div>
  );
}
