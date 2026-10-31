import type { Metadata, Viewport } from 'next';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource-variable/outfit';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/instrument-serif/400.css';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import Header from '@/components/Header';
import Tracker from '@/components/Tracker';
import MobileNav from '@/components/MobileNav';
import { themeScript } from '@/components/theme-script';
import './globals.css';

import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'CINE·MOOD — cinematic discovery & community reviews', template: '%s · CINE·MOOD' },
  description:
    'CINE·MOOD is a film discovery and review platform with IMDbio search, posters, cast, official YouTube trailers and Gemini-powered Jarvis review drafts in your own voice.',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'CINE·MOOD',
    title: 'CINE·MOOD — cinematic discovery & community reviews',
    description: 'Cinematic discovery, expert verdicts and community reviews.'
  },
  twitter: { card: 'summary_large_image', creator: '@cinemood' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: { canonical: '/' },
  keywords: ['movie reviews', 'film community', 'cinema ratings', 'Hinglish reviews', 'CINE MOOD'],
  applicationName: 'CINE·MOOD',
  authors: [{ name: 'Harsh Upadhyay', url: 'https://github.com/Dev-Harshupadhyay' }],
  category: 'entertainment'
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
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${siteUrl}/#website`,
                  url: siteUrl,
                  name: 'CINE·MOOD',
                  description: 'Cinematic discovery, editorial verdicts and community reviews.',
                  inLanguage: ['en', 'hi'],
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/movies?q={search_term_string}` },
                    'query-input': 'required name=search_term_string'
                  }
                },
                {
                  '@type': 'Organization',
                  '@id': `${siteUrl}/#org`,
                  name: 'CINE·MOOD',
                  url: siteUrl,
                  logo: `${siteUrl}/icon.svg`,
                  founder: { '@type': 'Person', name: 'Harsh Upadhyay' },
                  sameAs: ['https://github.com/Dev-Harshupadhyay/Cinenvood']
                }
              ]
            })
          }}
        />
        <Header />
        <main>{children}</main>
        <Tracker />
        <MobileNav />
        <Analytics />
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
                <Link href="/about#who">Who it&apos;s for</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/support">Support the dev</Link>
                <Link href="/legal">Legal &amp; DMCA</Link>
                <Link href="/admin">Admin</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} CINE·MOOD · reviews only, no downloads</span>
              <span>Next.js · Prisma · Auth.js · TMDB + IMDbio metadata</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
