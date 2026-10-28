import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CINE·MOOD — community verdicts on cinema';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px',
          background: 'radial-gradient(900px 500px at 80% 0%, #123b2c 0%, #08090b 55%)',
          color: '#f2f4f3',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, letterSpacing: 6, color: '#39d98a', textTransform: 'uppercase' }}>
          <div style={{ width: 12, height: 12, borderRadius: 99, background: '#39d98a', display: 'flex' }} />
          Review · Rate · Discuss
        </div>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, letterSpacing: -3, marginTop: 24 }}>
          CINE<span style={{ color: '#39d98a' }}>·</span>MOOD
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#a7b0ad', marginTop: 18, maxWidth: 900, lineHeight: 1.3 }}>
          Honest community verdicts on films — no files, no downloads, sirf reviews.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 44 }}>
          {['10-point ratings', 'Spoiler-safe reviews', 'Watchlist', 'Admin moderation'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                padding: '12px 22px',
                borderRadius: 999,
                border: '1px solid #2a3230',
                fontSize: 22,
                color: '#cdd4d1',
                background: 'rgba(255,255,255,0.03)'
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
