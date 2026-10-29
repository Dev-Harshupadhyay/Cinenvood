import Link from 'next/link';
import type { PosterTitle } from '@/lib/queries';
import { formatRuntime } from '@/lib/format';

export default function PosterCard({ title, priority = false }: { title: PosterTitle; priority?: boolean }) {
  const score = title.communityScore ?? title.tmdbScore ?? title.imdbRating;
  return (
    <Link href={`/movies/${title.slug}`} className="poster-card">
      <div className="poster-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={title.poster}
          alt={`${title.title} poster`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          width={500}
          height={750}
        />
        {score ? (
          <span className="poster-score">
            <b>★</b>
            {score.toFixed(1)}
          </span>
        ) : null}
        <div className="poster-hover">
          <span className="ph-meta">
            {title.reviewCount > 0 ? `${title.reviewCount} review${title.reviewCount > 1 ? 's' : ''}` : 'No reviews'}
          </span>
          <span className="ph-go">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      <div className="poster-body">
        <h3 title={title.title}>{title.title}</h3>
        <p className="pm">
          {title.year}
          <i />
          {formatRuntime(title.runtime)}
          {title.genres[0] ? (
            <>
              <i />
              {title.genres[0]}
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
