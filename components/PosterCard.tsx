import Link from 'next/link';
import type { PosterTitle } from '@/lib/queries';
import { formatRuntime } from '@/lib/format';
import PosterImage from '@/components/PosterImage';

export default function PosterCard({
  title,
  priority = false,
  posterOnly = false
}: {
  title: PosterTitle;
  priority?: boolean;
  posterOnly?: boolean;
}) {
  const score = posterOnly ? null : title.communityScore ?? title.tmdbScore ?? title.imdbRating;
  const isSeries = title.mediaType === 'tv';
  return (
    <Link href={`/movies/${title.slug}`} className="poster-card" data-poster-only={posterOnly} data-media-type={isSeries ? 'tv' : 'movie'}>
      <div className="poster-media">
        <PosterImage
          src={title.poster}
          title={title.title}
          year={title.year}
          mediaType={isSeries ? 'tv' : 'movie'}
          imdbId={title.imdbId}
          loading={priority ? 'eager' : 'lazy'}
        />
        {isSeries ? <span className="poster-kind">SERIES</span> : null}
        {score ? <span className="poster-score"><b>★</b>{score.toFixed(1)}</span> : null}
        <div className="poster-hover">
          <span className="ph-meta">View title</span>
          <span className="ph-go" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      <div className="poster-body">
        <h3 title={title.title}>{title.title}</h3>
        {posterOnly ? (
          <p className="pm">{title.year}{isSeries ? <><i />TV series</> : null}</p>
        ) : (
          <p className="pm">
            {title.year}<i />{isSeries ? 'TV series' : formatRuntime(title.runtime)}
            {title.genres[0] ? <><i />{title.genres[0]}</> : null}
          </p>
        )}
      </div>
    </Link>
  );
}
