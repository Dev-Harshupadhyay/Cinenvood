import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'About CINE·MOOD',
  description: 'How CINE·MOOD works: cinematic discovery, editorial verdicts, community reviews and the stack behind it.',
  alternates: { canonical: '/about' }
};

const STATS = [
  { k: '14', l: 'films seeded' },
  { k: '24', l: 'reviews' },
  { k: '7', l: 'members' },
  { k: '0', l: 'downloads ever' }
];

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 36, paddingBottom: 64, maxWidth: 900 }}>
      {/* ---------- ABOUT THE SITE ---------- */}
      <section id="site">
        <div className="eyebrow">About this site</div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', marginBottom: 12 }}>
          Reviews, not downloads<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 18 }}>
          CINE·MOOD is a film discovery and review platform. Metadata (poster, cast, synopsis) comes from TMDB;
          the verdict comes from people. No files, no mirrors, no torrents — ever. That keeps the product legal,
          advertiser-safe and around for the long run.
        </p>

        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {STATS.map((s) => (
            <div className="stat-card" key={s.l}>
              <div className="sl">{s.l}</div>
              <div className="sv">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-title"><span>What you can do here</span></div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2, fontSize: 14, color: 'var(--muted)' }}>
            <li><b>Rate &amp; review</b> any film on a 10-point scale with a headline and a spoiler flag</li>
            <li><b>Like and comment</b> on other people&apos;s reviews — login required, Google or demo</li>
            <li><b>Watchlist</b> films you want to see, and like the ones you loved</li>
            <li><b>Browse</b> by genre, sort by trending, rating, newest or title</li>
            <li><b>Admin verdicts</b> — pinned editorial reviews show first, everywhere</li>
          </ul>
        </div>

        <div className="panel" style={{ marginBottom: 8 }}>
          <div className="panel-title"><span>Stack</span></div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2, fontSize: 14, color: 'var(--muted)' }}>
            <li>Next.js 15 App Router · React 19 · TypeScript</li>
            <li>Prisma + <b>Supabase Postgres</b> (schema <code className="mono">cinemood</code>)</li>
            <li>Auth.js v5 — Google OAuth + demo email login, JWT sessions, role-based admin</li>
            <li>TMDB API through a server-side proxy (ISP-block safe) · OMDb for IMDb / RT scores</li>
            <li>Custom CSS design system — 5 accent themes, real light mode, mobile-first</li>
          </ul>
        </div>
      </section>

      {/* ---------- ABOUT THE DEV ---------- */}
      <section id="dev" style={{ marginTop: 44 }}>
        <div className="eyebrow">About the developer</div>
        <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', marginBottom: 14 }}>Built by Harsh Upadhyay</h2>

        <div className="panel" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className="avatar"
              style={{ width: 64, height: 64, fontSize: 22, background: 'linear-gradient(135deg,#12b76a,#0e7c4a)' }}
            >
              HU
            </span>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 18, fontWeight: 650 }}>Harsh Upadhyay</div>
              <div className="faint mono" style={{ fontSize: 11, letterSpacing: '0.12em', marginTop: 2 }}>
                FOUNDER · FULL-STACK · EDITOR-IN-CHIEF
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <a
                href="https://github.com/Dev-Harshupadhyay"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
              >
                GitHub
              </a>
              <a
                href="https://github.com/Dev-Harshupadhyay/Cinenvood"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
              >
                This repo
              </a>
            </div>
          </div>

          <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.85, margin: 0 }}>
            Harsh builds and maintains CINE·MOOD end to end — Next.js frontend, Prisma data layer, Auth.js,
            admin tooling, and the review pipeline. The idea is simple: cinema deserves better than a download table.
            Write what you felt, argue about the third act, keep a watchlist — and support the people who actually
            make films.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/reviews" className="btn btn-primary btn-sm">Read the reviews</Link>
            <Link href="/community" className="btn btn-sm">Meet the community</Link>
            <Link href="/legal" className="btn btn-ghost btn-sm">Legal &amp; DMCA</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
