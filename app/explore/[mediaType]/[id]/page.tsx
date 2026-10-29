import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchTitle, type MediaType } from '@/lib/tmdb';
import { formatRuntime } from '@/lib/format';
import { getCurrentUser } from '@/lib/session';

function validTitleRequest(mediaType: string, id: string) {
  return (mediaType === 'movie' || mediaType === 'tv') && /^\d+$/.test(id);
}

async function loadTitle(mediaType: string, id: string) {
  if (!validTitleRequest(mediaType, id)) return null;
  return fetchTitle(Number(id), mediaType as MediaType);
}

export async function generateMetadata({ params }: { params: Promise<{ mediaType: string; id: string }> }): Promise<Metadata> {
  const { mediaType, id } = await params;
  if (!validTitleRequest(mediaType, id)) notFound();
  const title = await loadTitle(mediaType, id);
  if (!title) return { title: 'TMDB details temporarily unavailable', robots: { index: false } };
  return {
    title: `${title.title} (${title.year})`,
    description: title.overview.slice(0, 155),
    openGraph: { title: `${title.title} (${title.year})`, description: title.overview.slice(0, 155), images: [title.poster] }
  };
}

export default async function ExploreTitlePage({ params }: { params: Promise<{ mediaType: string; id: string }> }) {
  const { mediaType, id } = await params;
  if (!validTitleRequest(mediaType, id)) notFound();
  const title = await loadTitle(mediaType, id);
  if (!title) {
    return (
      <div className="container explore-page">
        <div className="empty">
          <b>Title details are temporarily unavailable</b>
          TMDB may be slow or unreachable right now. Your search is still fine — try again shortly or return to the catalogue.
          <Link href="/movies" className="btn btn-sm" style={{ marginTop: 10 }}>Back to catalogue</Link>
        </div>
      </div>
    );
  }
  const user = await getCurrentUser();
  const tmdbLink = `https://www.themoviedb.org/${title.mediaType}/${title.tmdbId}`;

  return (
    <div className="container explore-page">
      <div className="backdrop-strip" style={{ backgroundImage: `url(${title.backdrop || title.poster})` }} />
      <div className="explore-hero">
        <div className="explore-poster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={title.poster} alt={`${title.title} poster`} />
        </div>
        <div className="explore-copy">
          <div className="eyebrow">TMDB discovery · {title.mediaType === 'tv' ? 'TV series' : 'Film'}</div>
          <h1>{title.title}</h1>
          <div className="detail-meta">
            <span className="tag">{title.year}</span>
            {title.runtime > 0 ? <span className="tag">{title.mediaType === 'tv' ? `${formatRuntime(title.runtime)} / episode` : formatRuntime(title.runtime)}</span> : null}
            {title.genres.map((genre) => <span key={genre} className="tag">{genre}</span>)}
            <span className="tag tag-gold">★ {title.imdbRating.toFixed(1)} TMDB</span>
          </div>
          <p className="explore-overview">{title.overview}</p>
          {title.director ? <p className="explore-creator">{title.mediaType === 'tv' ? 'Created by' : 'Directed by'} · {title.director}</p> : null}
          <div className="hero-actions">
            <a href={tmdbLink} target="_blank" rel="noreferrer" className="btn btn-primary">Open on TMDB ↗</a>
            <Link href="/movies" className="btn btn-ghost">Back to catalogue</Link>
          </div>
        </div>
      </div>

      <div className="explore-notice">
        <div>
          <b>Not in the CINE·MOOD catalogue yet</b>
          <p>This is a TMDB discovery result. Reviews and watchlists become available after it is added to the site catalogue.</p>
        </div>
        {user?.role === 'ADMIN' ? <Link href={`/admin?tab=import`} className="btn btn-sm">Add from admin →</Link> : null}
      </div>
    </div>
  );
}
