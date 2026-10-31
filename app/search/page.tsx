import type { Metadata } from 'next';
import Link from 'next/link';
import { searchEverywhere } from '@/lib/search';
import JarvisAutoReview from '@/components/JarvisAutoReview';
import PosterImage from '@/components/PosterImage';

export const metadata: Metadata = {
  title: 'Search movies & series',
  description: 'Search the CINE·MOOD catalogue and discover movie and TV titles, posters, and metadata through IMDbio.',
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
          <div className="search-result-card" key={item.key} style={{ ['--result-index' as string]: index }}>
            <Link href={item.href} className="search-result-link">
              <div className="search-result-poster">
                <PosterImage
                  src={item.poster}
                  title={item.title}
                  year={item.year}
                  mediaType={item.mediaType}
                  imdbId={item.imdbId}
                  fallbackSource={item.source === 'imdb' ? 'tmdb' : 'imdbio'}
                  loading={index < 8 ? 'eager' : 'lazy'}
                />
                <span className={`search-kind search-kind--${item.mediaType}`}>{item.mediaType === 'tv' ? 'SERIES' : 'FILM'}</span>
                {item.score ? <span className="search-result-score">★ {item.score.toFixed(1)}</span> : null}
              </div>
              <div className="search-result-title">{item.title}</div>
              <div className="search-result-meta">{item.year || 'Year TBA'} · {item.source === 'catalogue' ? 'In catalogue' : item.source === 'imdb' ? 'IMDbio discovery' : 'TMDB discovery'}</div>
            </Link>
            <JarvisAutoReview imdbId={item.imdbId} titleId={item.titleId} title={item.title} compact />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="container search-page">
      <div className="eyebrow">CINE·MOOD discovery</div>
      <h1>{query ? <>Results for <span>“{query}”</span></> : 'Search movies & series'}</h1>
      <p className="sub">Films and TV series from the Cinevood catalogue, with IMDb discovery when the service is configured.</p>
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
