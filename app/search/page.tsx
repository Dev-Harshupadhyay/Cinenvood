import type { Metadata } from 'next';
import Link from 'next/link';
import { searchEverywhere } from '@/lib/search';

export const metadata: Metadata = {
  title: 'Search movies & series',
  description: 'Search the CINE·MOOD catalogue and discover movies and TV series from TMDB.',
  robots: { index: false, follow: false }
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 100);
  const results = query.length >= 2 ? await searchEverywhere(query).catch(() => []) : [];
  const films = results.filter((result) => result.mediaType === 'movie');
  const series = results.filter((result) => result.mediaType === 'tv');

  function cards(items: typeof results) {
    return (
      <div className="search-results-grid">
        {items.map((item, index) => (
          <Link href={item.href} className="search-result-card" key={item.key} style={{ ['--result-index' as string]: index }}>
            <div className="search-result-poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.poster || '/posters/placeholder.svg'} alt={`${item.title} poster`} loading={index < 8 ? 'eager' : 'lazy'} />
              <span className={`search-kind search-kind--${item.mediaType}`}>{item.mediaType === 'tv' ? 'SERIES' : 'FILM'}</span>
              {item.score ? <span className="search-result-score">★ {item.score.toFixed(1)}</span> : null}
            </div>
            <div className="search-result-title">{item.title}</div>
            <div className="search-result-meta">{item.year || 'Year TBA'} · {item.source === 'catalogue' ? 'In catalogue' : 'TMDB discovery'}</div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="container search-page">
      <div className="eyebrow">CINE·MOOD discovery</div>
      <h1>{query ? <>Results for <span>“{query}”</span></> : 'Search movies & series'}</h1>
      <p className="sub">Films and TV series from the catalogue, with wider TMDB discovery when available.</p>
      {query.length < 2 ? (
        <div className="empty"><b>Type at least two characters</b>Use the search bar above to find a title or series.</div>
      ) : results.length === 0 ? (
        <div className="empty"><b>No title found yet</b>Try a shorter title, original spelling, or another keyword.</div>
      ) : (
        <>
          <div className="search-results-count">{results.length} matching titles · {films.length} films · {series.length} series</div>
          {films.length ? <section className="search-results-section"><div className="panel-title"><span>Films</span><span>{films.length}</span></div>{cards(films)}</section> : null}
          {series.length ? <section className="search-results-section"><div className="panel-title"><span>TV series</span><span>{series.length}</span></div>{cards(series)}</section> : null}
        </>
      )}
      <div className="search-page-actions">
        <Link href="/movies" className="btn btn-ghost">Browse the catalogue</Link>
      </div>
    </div>
  );
}
