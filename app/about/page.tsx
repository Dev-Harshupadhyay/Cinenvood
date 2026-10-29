import Link from 'next/link';
import Image from 'next/image';
import TelegramButton from '@/components/TelegramButton';

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

        <div className="panel" style={{ marginBottom: 8 }} id="who">
          <div className="panel-title"><span>Ye site kiske liye hai</span></div>
          <div className="who-grid">
            <div>
              <h3>Film dekhne se pehle ek honest raay chahiye</h3>
              <p>
                Trailer hype bechta hai, review sach batata hai. Yahan aap 30 second mein pata kar sakte ho ki film
                aapke mood ki hai ya nahi — kis genre ki hai, kitni lambi hai, aur logon ne use kitna score diya.
              </p>
            </div>
            <div>
              <h3>Hinglish mein padhne wale, aur English mein bhi</h3>
              <p>
                India se kholo to reviews Hinglish mein, bahar se kholo to English edition — same review, same opinion.
                Ek tap se switch bhi kar sakte ho.
              </p>
            </div>
            <div>
              <h3>Jo apni raay likhna chahte hain</h3>
              <p>
                Google se sign in karo, 10-point rating do, review likho — aur doosron ke reviews par Agree ya reply
                karo. Ek account, ek film, ek review: spam ka rasta band.
              </p>
            </div>
            <div>
              <h3>Jo download nahi, discussion chahte hain</h3>
              <p>
                Yahan koi file, torrent ya mirror nahi hai — sirf cinema par baat. Isi wajah se site legal rehti hai
                aur lambe samay tak chalti hai.
              </p>
            </div>
          </div>
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
        <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', marginBottom: 14 }}>Built, written and run by one person</h2>

        <div className="dev-card">
          <div className="dev-logo">
            {/* the plain site mark — no generated art, just the logo */}
            <Image src="/icon.svg" alt="CINE·MOOD logo" width={52} height={52} unoptimized />
          </div>

          <div>
            <div className="dev-name">Harsh Upadhyay</div>
            <div className="dev-role">Developer · Founder · Editor-in-chief</div>

            <p className="muted" style={{ fontSize: 14, lineHeight: 1.85, margin: '12px 0 0' }}>
              Harsh builds and maintains CINE·MOOD end to end — Next.js frontend, Prisma data layer, Auth.js, admin
              tooling, the review pipeline aur Jarvis (AI drafts). Idea simple hai: cinema deserves better than a
              download table — ek aisi jagah jahan raay likhi jaaye, argument ho, aur spoiler se bacha jaaye.
            </p>

            <div className="dev-links">
              <a href="https://new-profotilo-flame.vercel.app" target="_blank" rel="noreferrer">
                Portfolio <strong>↗</strong>
              </a>
              <a href="https://verceel-timepass.vercel.app" target="_blank" rel="noreferrer">
                Timepass <strong>↗</strong>
              </a>
              <a href="https://github.com/Dev-Harshupadhyay" target="_blank" rel="noreferrer">
                GitHub <strong>↗</strong>
              </a>
              <a href="https://github.com/Dev-Harshupadhyay/Cinenvood" target="_blank" rel="noreferrer">
                This repo <strong>↗</strong>
              </a>
            </div>

            <div className="tg-row" style={{ marginTop: 16 }}>
              <TelegramButton label="Join the Telegram channel" sub="updates · bugs · film talk" />
              <Link href="/support" className="btn btn-primary btn-sm">Support the dev</Link>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <Link href="/faq" className="btn btn-sm btn-ghost">FAQ</Link>
          <Link href="/legal" className="btn btn-sm btn-ghost">Legal &amp; DMCA</Link>
          <Link href="/reviews" className="btn btn-sm btn-ghost">Read the reviews</Link>
        </div>
      </section>
    </div>
  );
}
