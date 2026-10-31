import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PosterCard from '@/components/PosterCard';
import ReviewCard from '@/components/ReviewCard';
import ReviewComposer from '@/components/ReviewComposer';
import TitleActions from '@/components/TitleActions';
import { getSessionUser } from '@/lib/session';
import { getCatalogue, getTitleBySlug, withViewerLikes } from '@/lib/queries';
import { getEdition } from '@/lib/edition';
import DataBanner from '@/components/DataBanner';
import RatingScene from '@/components/RatingScene';
import EditionSwitch from '@/components/EditionSwitch';
import TrailerModal from '@/components/TrailerModal';
import { avatarGradient, formatRuntime, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getImdbReviews, getImdbTitleForCatalogue } from '@/lib/imdbio';
import ImdbTrailer from '@/components/ImdbTrailer';
import JarvisAutoReview from '@/components/JarvisAutoReview';
import PosterImage from '@/components/PosterImage';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  // throw before the shell streams so crawlers get a real 404
  if (!title) notFound();
  return {
    title: `${title.title} (${title.year}) · ${title.mediaType === 'tv' ? 'Series' : 'Film'}`,
    description: title.overview.slice(0, 155),
    alternates: { canonical: `/movies/${title.slug}` },
    openGraph: { title: `${title.title} (${title.year})`, description: title.overview.slice(0, 155), images: [title.poster] }
  };
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [title, sessionUser, edition] = await Promise.all([getTitleBySlug(slug), getSessionUser(), getEdition()]);
  if (!title) notFound();

  const imdbData = await getImdbTitleForCatalogue({
    title: title.title,
    year: title.year,
    mediaType: title.mediaType === 'tv' ? 'tv' : 'movie',
    imdbId: title.imdbId
  });
  const imdbReviewResults = imdbData ? await getImdbReviews(imdbData.imdbId) : [];
  const imdbReviews = imdbReviewResults.filter((review) => review.spoiler === false);
  const imdbRating = imdbData?.rating ?? (title.imdbId ? title.imdbRating : null);
  const imdbPoster = imdbData?.coverUrl || title.poster;
  const imdbOverview = imdbData?.plot || imdbData?.summaries[0] || title.overview;
  const imdbGenres = imdbData?.genres.length ? imdbData.genres : title.genres;
  const imdbRuntime = imdbData?.duration ?? title.runtime;
  const imdbDirector = imdbData?.directors.map((person) => person.name).filter(Boolean).join(', ') || title.director;
  const displayCast: { name: string; role?: string; img?: string | null }[] = imdbData?.stars.length
    ? imdbData.stars.slice(0, 12).map((person) => ({ name: person.name, role: person.characters.join(', '), img: person.pictureUrl }))
    : title.cast;
  const viewerId = sessionUser?.id;
  const [likes, watch, similar, reviews] = await Promise.all([
    viewerId ? prisma.titleLike.findUnique({ where: { userId_titleId_kind: { userId: viewerId, titleId: title.id, kind: 'LIKE' } } }) : null,
    viewerId ? prisma.titleLike.findUnique({ where: { userId_titleId_kind: { userId: viewerId, titleId: title.id, kind: 'WATCHLIST' } } }) : null,
    getCatalogue({ genre: title.genres[0] ?? 'All', take: 12 }),
    withViewerLikes(title.reviews, viewerId)
  ]);

  const allReviewsForCards = reviews.map((r) => ({
    ...r,
    title: { id: title.id, slug: title.slug, title: title.title, year: title.year, poster: title.poster, imdbId: title.imdbId, mediaType: title.mediaType, imdbRating: title.imdbRating }
  }));
  const reviewsForCards = allReviewsForCards.filter((review) => !review.sourceLang?.startsWith('jarvis-auto'));
  const myReview = sessionUser ? reviewsForCards.find((r) => r.user?.email === sessionUser.email) ?? null : null;
  const related = similar.filter((t) => t.id !== title.id).slice(0, 5);
  const score = title.communityScore ?? imdbRating ?? title.tmdbScore ?? 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': title.mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: title.title,
    description: imdbOverview,
    datePublished: String(imdbData?.year ?? title.year),
    genre: imdbGenres,
    image: imdbPoster,
    director: imdbDirector ? { '@type': 'Person', name: imdbDirector } : undefined,
    aggregateRating:
      title.communityScore && title.communityReviewCount > 0
        ? { '@type': 'AggregateRating', ratingValue: title.communityScore, bestRating: 10, worstRating: 1, ratingCount: title.communityReviewCount }
        : undefined
  };

  return (
    <div className="container page-clip movie-detail-page" style={{ position: 'relative' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'Films & series', item: `${siteUrl}/movies` },
              { '@type': 'ListItem', position: 3, name: title.title, item: `${siteUrl}/movies/${title.slug}` }
            ]
          })
        }}
      />
      <div className="backdrop-strip" style={{ backgroundImage: `url(${title.backdrop || imdbPoster})` }} />

      <div className="detail-hero">
        <div className="detail-poster">
          <PosterImage
            src={title.poster}
            secondarySrc={imdbData?.coverUrl}
            title={title.title}
            year={title.year}
            mediaType={title.mediaType === 'tv' ? 'tv' : 'movie'}
            imdbId={title.imdbId}
            width={500}
            height={750}
          />
        </div>

        <div className="detail-intro">
          <div className="eyebrow">{title.mediaType === 'tv' ? 'TV series' : 'Movie'} · {title.year}</div>
          <h1 className="detail-title">{title.title}</h1>

          <div className="detail-meta">
            <span className="tag">{title.mediaType === 'tv' ? `${formatRuntime(imdbRuntime)} / ep` : formatRuntime(imdbRuntime)}</span>
            {imdbGenres.map((g) => (
              <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`} className="tag">
                {g}
              </Link>
            ))}
            {imdbRating !== null ? <span className="tag tag-gold">★ {imdbRating.toFixed(1)} IMDb</span> : null}
            {title.tmdbScore !== null ? <span className="tag">★ {title.tmdbScore.toFixed(1)} TMDB</span> : null}
            <span className="tag tag-accent">{title.communityReviewCount} community reviews</span>
            {imdbDirector ? <span className="tag">Dir. {imdbDirector}</span> : null}
          </div>
        </div>

        <div className="detail-body">
          <RatingScene
            score={score}
            communityVotes={title._count.likes}
            reviewCount={title.communityReviewCount}
            imdbRating={imdbRating}
            myRating={myReview?.rating ?? null}
            buckets={title.ratingBuckets}
            genres={imdbGenres}
            runtime={imdbRuntime}
            mediaType={title.mediaType === 'tv' ? 'tv' : 'movie'}
          />

          <p className="detail-overview">{imdbOverview}</p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <TitleActions
              titleId={title.id}
              authed={Boolean(sessionUser)}
              initialLike={Boolean(likes)}
              likes={title._count.likes}
              initialWatch={Boolean(watch)}
            />
            <Link href="#review" className="btn btn-primary">
              Write a review
            </Link>
            <Link href={`/jarvis?titleId=${encodeURIComponent(title.id)}`} className="btn btn-ghost">Ask Jarvis</Link>
            {title.trailerEn || title.trailerHi ? <TrailerModal title={title.title} trailerEn={title.trailerEn} trailerHi={title.trailerHi} /> : <ImdbTrailer title={title.title} year={title.year} />}
          </div>

          {displayCast.length > 0 ? (
            <>
              <div className="divider-line" />
              <div className="panel-title" style={{ marginBottom: 8 }}>
                <span>Top cast</span>
              </div>
              <div className="cast-grid">
                {displayCast.map((c) => (
                  <div key={c.name} className="cast-card">
                    <span className="cast-photo">
                      {c.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.img} alt={c.name} loading="lazy" />
                      ) : (
                        <span style={{ background: avatarGradient(c.name) }}>{initials(c.name)}</span>
                      )}
                    </span>
                    <span className="cast-info">
                      <span className="cast-name">{c.name}</span>
                      {c.role ? <span className="cast-role">{c.role}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="divider-line" style={{ margin: '30px 0 22px' }} />

      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} id="review">
          <ReviewComposer
            titleId={title.id}
            titleName={title.title}
            authed={Boolean(sessionUser)}
            existing={myReview ? { id: myReview.id, rating: myReview.rating, headline: myReview.headline, body: myReview.body, spoiler: myReview.spoiler } : null}
          />

          <JarvisAutoReview titleId={title.id} imdbId={title.imdbId} title={title.title} />

          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="eyebrow">Community</div>
              <h2 style={{ fontSize: 24 }}>Reviews · {reviewsForCards.length}</h2>
            </div>
            <EditionSwitch current={edition} compact />
          </div>

          {reviewsForCards.length === 0 ? (
            <div className="empty">
              <b>No reviews yet</b>
              Pehla verdict tumhara ho sakta hai.
            </div>
          ) : (
            <div className="review-list">
              {reviewsForCards.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r as any}
                  authed={Boolean(sessionUser)}
                  edition={edition}
                  canFeature={sessionUser?.role === 'ADMIN'}
                />
              ))}
            </div>
          )}

          {imdbReviews.length ? (
            <section style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <div className="section-head" style={{ marginBottom: 0 }}>
                <div><div className="eyebrow">External source · IMDb</div><h2 style={{ fontSize: 22 }}>IMDb non-spoiler reviews</h2></div>
                {title.imdbId ? <a href={`https://www.imdb.com/title/${title.imdbId}/reviews/`} target="_blank" rel="noreferrer" className="link-more">View all ↗</a> : null}
              </div>
              {imdbReviews.slice(0, 5).map((review, index) => (
                <article className="panel" key={`${review.summary ?? 'review'}-${index}`}>
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
              <p className="faint" style={{ fontSize: 11 }}>Only non-spoiler IMDb reviews are shown separately; your Cinevood community reviews and My Reviews data are unchanged.</p>
            </section>
          ) : null}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-title">
              <span>Title facts</span>
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              {[
                ['Year', imdbData?.year ?? title.year],
                [title.mediaType === 'tv' ? 'Episode runtime' : 'Runtime', title.mediaType === 'tv' ? `${formatRuntime(imdbRuntime)} / ep` : formatRuntime(imdbRuntime)],
                ['Genres', imdbGenres.join(', ') || '—'],
                ['Director', imdbDirector ?? '—'],
                ['Likes', title._count.likes],
                ['Reviews', reviewsForCards.length]
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span className="faint mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {k}
                  </span>
                  <span style={{ textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <span>More like this</span>
            </div>
            <div className="rank-list">
              {related.map((t) => (
                <Link key={t.id} href={`/movies/${t.slug}`} className="rank-row">
                  <PosterImage
                    className="rank-poster"
                    src={t.poster}
                    title={t.title}
                    year={t.year}
                    mediaType={t.mediaType}
                    imdbId={t.imdbId}
                    alt=""
                    loading="lazy"
                  />
                  <span className="rank-info">
                    <span className="rn">{t.title}</span>
                    <span className="rm">{t.year}</span>
                  </span>
                  <span className="rank-score">{(t.communityScore ?? t.tmdbScore ?? t.imdbRating ?? 0).toFixed(1)}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
