import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CINE·MOOD — community verdicts on cinema',
    short_name: 'CINE·MOOD',
    description: 'Rate films, write spoiler-safe reviews, build a watchlist — no downloads, sirf cinema.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090b',
    theme_color: '#39d98a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  };
}
