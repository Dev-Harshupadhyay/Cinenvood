import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getImdbReviews, getImdbTitle } from '@/lib/imdbio';
import ImdbTrailer from '@/components/ImdbTrailer';
import JarvisAutoReview from '@/components/JarvisAutoReview';
import PosterImage from '@/components/PosterImage';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const title = await getImdbTitle(id);
  return title
    ? { title: `${title.title} · IMDb · Cinevood`, description: (title.plot ?? '').slice(0, 155) }
    : { title: 'IMDb title · Cinevood' };
}

export default async function ImdbTitlePage({ params }: Props) {
  const { id } = await params;
  if (!/^tt\d+$/.test(id)) notFound();
  const [title, imdbReviewResults] = await Promise.all([getImdbTitle(id), getImdbReviews(id)]);
  const imdbReviews = imdbReviewResults.filter((review) => review.spoiler === false);

  if (!title) {
    return (
      <main className="container page-clip" style={{ paddingTop: 48, paddingBottom: 60 }}>
        <div className="empty">
          <b>IMDb details are temporarily unavailable</b>
          The IMDbio service may be offline or this title may no longer be available. Your Cinevood catalogue and community reviews are unaffected.
          <Link href="/search" className="btn btn-ghost">Back to search</Link>
        </div>
      </main>
    );
  }

  const cast = title.stars.slice(0, 12);
  const directors = title.directors.map((person) => person.name).filter(Boolean);

  return (
    <main className="container page-clip" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <Link href="/" className="tag">← Cinevood</Link>
      <div className="detail-hero" style={{ marginTop: 22 }}>
        <div className="detail-poster">
          <PosterImage
            src={title.coverUrl}
            title={title.title}
            year={title.year}
            mediaType={title.kind?.toLowerCase().includes('series') ? 'tv' : 'movie'}
            imdbId={title.imdbId}
            fallbackSource="tmdb"
            width={500}
            height={750}
          />
        </div>
        <div className="detail-intro">
          <div className="eyebrow">IMDb source · {title.kind || 'Title'}</div>
          <h1 className="detail-title">{title.title}</h1>
          <div className="detail-meta">
            {title.year ? <span className="tag">{title.year}</span> : null}
            {title.duration ? <span className="tag">{title.duration} min</span> : null}
            {title.genres.slice(0, 4).map((genre) => <span className="tag" key={genre}>{genre}</span>)}
            {title.rating !== null ? <span className="tag tag-gold">★ {title.rating.toFixed(1)} IMDb</span> : <span className="tag">IMDb rating unavailable</span>}
          </div>
          <p className="detail-overview">{title.plot || title.summaries[0] || 'No synopsis available from IMDb.'}</p>
          <div className="detail-meta">
            {directors.length ? <span className="tag">Dir. {directors.join(', ')}</span> : null}
            <ImdbTrailer title={title.title} year={title.year} />
            <a className="btn btn-primary" href={`https://www.imdb.com/title/${title.imdbId}/`} target="_blank" rel="noreferrer">Open on IMDb ↗</a>
          </div>
        </div>
      </div>

      {cast.length ? (
        <section style={{ marginTop: 34 }}>
          <div className="section-head"><div><div className="eyebrow">IMDb credits</div><h2>Cast & stars</h2></div></div>
          <div className="cast-grid">
            {cast.map((person, index) => (
              <div className="cast-card" key={`${person.name}-${index}`}>
                <span className="cast-photo">
                  {person.pictureUrl
                    ? <img src={person.pictureUrl} alt={person.name} loading="lazy" />
                    : <span>{person.name.slice(0, 1) || '?'}</span>}
                </span>
                <span className="cast-info">
                  <span className="cast-name">{person.name}</span>
                  {person.characters.length ? <span className="cast-role">{person.characters.join(', ')}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ marginTop: 28 }}><JarvisAutoReview imdbId={title.imdbId} title={title.title} /></div>

      <section style={{ marginTop: 38 }}>
        <div className="section-head">
          <div><div className="eyebrow">External source · IMDb</div><h2>IMDb non-spoiler reviews · {imdbReviews.length}</h2></div>
        </div>
        {imdbReviews.length ? (
          <div className="review-list">
            {imdbReviews.slice(0, 10).map((review, index) => (
              <article className="panel" key={`${review.summary ?? 'review'}-${index}`} style={{ marginBottom: 12 }}>
                <div className="panel-title">
                  <span>{review.summary || 'IMDb user review'}</span>
                  {review.authorRating !== null ? <span className="tag tag-gold">★ {review.authorRating}/10</span> : null}
                </div>
                {review.text ? <p style={{ whiteSpace: 'pre-wrap' }}>{review.text}</p> : null}
                <div className="faint mono" style={{ fontSize: 11 }}>
                  IMDb member
                  {review.upVotes !== null || review.downVotes !== null
                    ? ` · ${review.upVotes ?? 0} helpful · ${review.downVotes ?? 0} not helpful`
                    : ''}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty"><b>No non-spoiler IMDb reviews available</b>IMDbio did not return any non-spoiler public review text for this title right now.</div>
        )}
        <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>Only non-spoiler external IMDb reviews are shown here. Cinevood community reviews remain separate and are not modified.</p>
      </section>
    </main>
  );
}
