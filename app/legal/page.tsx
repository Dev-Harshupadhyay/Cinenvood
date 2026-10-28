import Link from 'next/link';

export const metadata = { title: 'Legal & DMCA' };

export default function LegalPage() {
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 820 }}>
      <div className="eyebrow">Legal</div>
      <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', marginBottom: 12 }}>Legal &amp; DMCA</h1>
      <p className="faint" style={{ marginBottom: 24, fontSize: 14 }}>
        Last updated: {new Date().getFullYear()} · This page explains what CINE·MOOD is and is not.
      </p>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>1. Reviews and metadata only</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          CINE·MOOD ek <b>editorial aur community review platform</b> hai. Hum koi film, series, audio ya video file host,
          stream, embed ya distribute nahi karte — na koi download link, na torrent, na mirror. Site par jo bhi media dikhta hai
          wo third-party metadata providers (jaise TMDB) ke posters/backdrops hain, jo unke attribution terms ke under use hote hain.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>2. Metadata attribution</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          This product uses the TMDB API but is not endorsed or certified by TMDB. Posters, backdrops, titles, synopsis aur cast
          jaankari unke respective owners ki property hai aur sirf identification/commentary ke purpose se dikhayi jaati hai.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>3. User content</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          Reviews aur comments likhne wale users apne content ke responsible hain. Hate speech, doxxing, spam, piracy links ya
          copyrighted material ke links turant remove kiye ja sakte hain aur account suspend ho sakta hai. Har review admin panel
          se moderate hota hai (publish / hide / delete).
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>4. DMCA / takedown</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          Agar aapko lagta hai ki koi user-generated review ya comment aapke copyright ka infringement karta hai, to ek notice
          bhejein jisme (a) copyrighted work ka description, (b) infringing URL, (c) aapka contact, aur (d) good-faith statement
          ho. Valid notice milne par content 72 hours ke andar remove kar diya jayega.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)', marginTop: 8 }}>
          Contact: <code className="mono">dmca@cinemood.app</code>
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>5. Privacy</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          Hum sirf wahi data store karte hain jo account banane ke liye chahiye: naam, email, avatar URL (Google se), reviews,
          comments aur watchlist. Passwords store nahi hote — Google OAuth ya demo email login use hota hai. Koi data bechа
          nahi karte. Account delete karne ke liye admin se request karein.
        </p>
      </div>

      <div className="panel">
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>6. Anti-piracy stance</h2>
        <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--muted)' }}>
          Hum filmmakers aur writers ka kaam respect karte hain. Film dekho — theatre, streaming ya jahan bhi legally available
          ho — aur yahan aakar apna verdict likho. Reviews se cinema zinda rehta hai, piracy se nahi.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <Link href="/about" className="btn btn-sm">How it works</Link>
          <Link href="/reviews" className="btn btn-sm btn-primary">Read reviews</Link>
        </div>
      </div>
    </div>
  );
}
