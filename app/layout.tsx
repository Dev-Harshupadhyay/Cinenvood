import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, Outfit, Poppins } from 'next/font/google';
import Link from 'next/link';
import Header from '@/components/Header';
import { themeScript } from '@/components/theme-script';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-outfit', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono-plex', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: ['400'], variable: '--font-serif', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'CINE·MOOD — cinematic discovery & community reviews', template: '%s · CINE·MOOD' },
  description:
    'CineMood is a premium film discovery and review platform — cinematic catalogue, community verdicts, ratings, likes and comments. Built on Next.js.',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'CINE·MOOD',
    title: 'CINE·MOOD — cinematic discovery & community reviews',
    description: 'Cinematic discovery, expert verdicts and community reviews.'
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070808' },
    { media: '(prefers-color-scheme: light)', color: '#f6f5f2' }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${poppins.variable} ${outfit.variable} ${mono.variable} ${serif.variable}`}>
        <Header />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <div className="brand" style={{ fontSize: 18, marginBottom: 8 }}>
                  CINE<span className="dot">·</span>MOOD
                </div>
                <p className="faint" style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>
                  Cinematic discovery, community verdicts aur honest reviews — ek hi jagah. Movies are art; yahan uspe baat hoti hai, files share nahi hoti.
                </p>
              </div>
              <div>
                <h4>Explore</h4>
                <Link href="/movies">All movies</Link>
                <Link href="/movies?sort=rating">Top rated</Link>
                <Link href="/movies?sort=newest">Newest</Link>
                <Link href="/reviews">Reviews feed</Link>
              </div>
              <div>
                <h4>Community</h4>
                <Link href="/community">Members</Link>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/login">Sign in</Link>
              </div>
              <div>
                <h4>About</h4>
                <Link href="/about">How it works</Link>
                <Link href="/legal">Legal &amp; DMCA</Link>
                <Link href="/admin">Admin</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} CINE·MOOD · reviews only, no downloads</span>
              <span>Next.js · Prisma · Auth.js · TMDB metadata</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
