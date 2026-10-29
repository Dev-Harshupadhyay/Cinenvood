import Link from 'next/link';
import SupportPanel from '@/components/SupportPanel';
import TelegramButton from '@/components/TelegramButton';

export const metadata = {
  title: 'Support the dev',
  description:
    'CINE·MOOD is free, ad-free and non-profit. Support the developer with UPI (pmharsh@fam), Razorpay, or just by sharing the site.',
  alternates: { canonical: '/support' }
};

const WHERE = [
  ['Server & database', 'Vercel hosting + Supabase Postgres — the monthly bill that keeps reviews online.'],
  ['TMDB & OMDb', 'Film metadata, posters and IMDb/RT scores. Free tiers, but rate limits cost time.'],
  ['Domain & assets', 'Domain renewal, fonts and the odd poster-sized test upload.'],
  ['Coffee', 'Honestly? Most of it. Late-night review edits run on chai.']
];

const STEPS = [
  ['UPI se', 'Amount chuno (25 / 50 / 100 ya custom) → button dabao → app khulega → approve.'],
  ['Ya QR se', 'Kisi bhi UPI app se QR scan karo — payee pmharsh@fam pehle se set hai.'],
  ['Card / netbanking', 'Razorpay link se card, netbanking ya wallet — desktop ke liye aasaan.'],
  ['Kuch nahi dena?', 'Koi dikkat nahi. Ek review likho ya link share karo — wahi sabse bada support hai.']
];

export default function SupportPage() {
  return (
    <div className="container" style={{ paddingTop: 30, paddingBottom: 70, maxWidth: 980 }}>
      <div className="eyebrow">Support</div>
      <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', marginBottom: 10 }}>
        CINE·MOOD free hai — aur free hi rehna chahiye<span style={{ color: 'var(--accent)' }}>.</span>
      </h1>
      <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.85, maxWidth: 720, marginBottom: 22 }}>
        Ye site ek banda chala raha hai — koi team nahi, koi investor nahi, koi ads nahi. Na aapka data bechta hai,
        na reviews ke peeche paywall lagata hai. Agar yahan likhi kisi review ne aapko ek bekaar film se bacha liya,
        ya koi film dekhne pe majboor kar diya — chhota sa tip dev ka server bill hai.
      </p>

      <SupportPanel />

      <div className="sup-two">
        <div className="panel">
          <div className="panel-title"><span>Paisa kahan jaata hai</span></div>
          <ul className="sup-list">
            {WHERE.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-title"><span>Payment kaise hota hai</span></div>
          <ol className="sup-steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="n">{i + 1}</span>
                <div>
                  <b>{t}</b>
                  <span>{d}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="sup-safe">
            🔒 Payment app ke andar hota hai — CINE·MOOD kabhi card number, UPI PIN ya bank details nahi maangta.
            Hum sirf UPI ID aur Razorpay ka official link dikhate hain.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title"><span>Thank you, seriously</span></div>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.9, margin: 0 }}>
          Har review, har like, har comment site ko zinda rakhta hai. Jo log tip bhejte hain — unke naam site par
          nahi aate, par unka server bill mein hissa hota hai. Jo nahi bhej sakte — bilkul theek hai, aap yahan
          padhne aaye, wahi kaafi hai. Ye platform non-profit hai; kuch bhi bache to wo agle mahine ke hosting mein
          chala jaata hai.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <Link href="/faq" className="btn btn-sm">Read the FAQ</Link>
          <Link href="/about#dev" className="btn btn-sm btn-ghost">About the developer</Link>
          <Link href="/reviews" className="btn btn-sm btn-ghost">Read a review instead</Link>
        </div>
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
            Tip dena possible nahi? Bilkul theek — Telegram channel join kar lena, wahan naye reviews aur site updates
            sabse pehle aate hain.
          </p>
          <TelegramButton label="Join the Telegram channel" sub="updates · new reviews · film talk" />
        </div>
      </div>
    </div>
  );
}
