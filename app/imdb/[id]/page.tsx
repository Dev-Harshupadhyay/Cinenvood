import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getImdbReviews, getImdbTitle } from '@/lib/imdbio';
import ImdbTrailer from '@/components/ImdbTrailer';

type Props = { params: Promise<{ id: string }> };
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const personName = (person: any) => typeof person === 'string' ? person : person?.name || person?.title || '';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const title = await getImdbTitle(id);
  return title ? { title: `${title.title} · IMDb · Cinevood`, description: String(title.plot || '').slice(0, 155) } : { title: 'IMDb title · Cinevood' };
}

export default async function ImdbTitlePage({ params }: Props) {
  const { id } = await params;
  const [title, imdbReviews] = await Promise.all([getImdbTitle(id), getImdbReviews(id)]);
  if (!title) notFound();

  const cast = list(title.stars).slice(0, 12);
  const directors = list(title.directors).map(personName).filter(Boolean);
  const rating = typeof title.rating === 'number' ? title.rating : null;
  const reviews = imdbReviews.slice(0, 10);

  return (
    <main className="container page-clip" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <Link href="/" className="tag">← Cinevood</Link>
      <div className="detail-hero" style={{ marginTop: 22 }}>
        <div className="detail-poster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={title.cover_url || '/posters/placeholder.svg'} alt={`${title.title} poster`} width={500} height={750} />
        </div>
        <div className="detail-intro">
          <div className="eyebrow">IMDb verified source · {title.kind || 'Title'}</div>
          <h1 className="detail-title">{title.title}</h1>
          <div className="detail-meta">
            {title.year ? <span className="tag">{title.year}</span> : null}
            {title.duration ? <span className="tag">{title.duration} min</span> : null}
            {list(title.genres).slice(0, 4).map((genre: string) => <span className="tag" key={genre}>{genre}</span>)}
            {rating !== null ? <span className="tag tag-gold">★ {rating.toFixed(1)} IMDb</span> : <span className="tag">IMDb rating unavailable</span>}
          </div>
          <p className="detail-overview">{title.plot || title.summaries?.[0] || 'No synopsis available from IMDb.'}</p>
          <div className="detail-meta">
            {directors.length ? <span className="tag">Dir. {directors.join(', ')}</span> : null}
            <ImdbTrailer title={title.title} year={title.year} />
            <a className="btn btn-primary" href={`https://www.imdb.com/title/${id}/`} target="_blank" rel="noreferrer">Open on IMDb ↗</a>
          </div>
        </div>
      </div>

      {cast.length ? <section style={{ marginTop: 34 }}>
        <div className="section-head"><div><div className="eyebrow">IMDb credits</div><h2>Cast & stars</h2></div></div>
        <div className="cast-grid">{cast.map((person: any, index: number) => <div className="cast-card" key={person.id || person.name || index}>
          <span className="cast-photo">{person.picture_url ? <img src={person.picture_url} alt={person.name || 'Cast'} loading="lazy" /> : <span>{(person.name || '?').slice(0, 1)}</span>}</span>
          <span className="cast-info"><span className="cast-name">{person.name}</span>{list(person.characters).length ? <span className="cast-role">{person.characters.join(', ')}</span> : null}</span>
        </div>)}</div>
      </section> : null}

      <section style={{ marginTop: 38 }}>
        <div className="section-head"><div><div className="eyebrow">External source · IMDb</div><h2>IMDb user reviews · {imdbReviews.length}</h2></div></div>
        {reviews.length ? <div className="review-list">{reviews.map((review: any, index: number) => <article className="panel" key={review.id || review.title || index} style={{ marginBottom: 12 }}>
          <div className="panel-title"><span>{review.title || review.summary || 'IMDb user review'}</span>{review.rating != null ? <span className="tag tag-gold">★ {review.rating}/10</span> : null}</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{review.text || review.content || review.reviewText || review.body || 'Review text unavailable.'}</p>
          <div className="faint mono" style={{ fontSize: 11 }}>{review.author || review.username || review.user?.name || 'IMDb user'}{review.date ? ` · ${review.date}` : ''}</div>
        </article>)}</div> : <div className="empty"><b>IMDb reviews unavailable</b>IMDb did not return public review data for this title right now.</div>}
        <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>These are external IMDb reviews. Cinevood community reviews remain separate and are not modified.</p>
      </section>
    </main>
  );
}
