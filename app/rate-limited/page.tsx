import Link from 'next/link';

export const metadata = { title: 'Slow down', robots: { index: false, follow: false } };

export default async function RateLimited({ searchParams }: { searchParams: Promise<{ retry?: string }> }) {
  const { retry } = await searchParams;
  const seconds = Math.max(5, Math.min(3600, Number(retry) || 60));

  return (
    <div className="container auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="eyebrow">429 · rate limit</div>
        <h1>Thoda ruk jao 🙏</h1>
        <p className="auth-sub">
          Bahut zyada requests aa rahi hain is account/IP se. Limit har request ke saath reset hoti hai —{' '}
          <b>{seconds}s</b> baad apne aap theek ho jayega.
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          <Link href="/" className="btn btn-primary btn-block">
            Home par wapas
          </Link>
          <Link href="/movies" className="btn btn-ghost btn-block">
            Browse catalogue
          </Link>
        </div>
        <p className="form-note" style={{ marginTop: 16 }}>
          Admin panel 120 req/min, admin actions 60 req/min — koi bypass nahi hai.
        </p>
      </div>
    </div>
  );
}
