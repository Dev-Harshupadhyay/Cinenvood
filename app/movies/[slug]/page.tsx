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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  // throw before the shell streams so crawlers get a real 404
  if (!title) notFound();
  return {
    title: `${title.title} (${title.year})`,
    description: title.overview.slice(0, 155),
    alternates: { canonical: `/movies/${title.slug}` },
    openGraph: { title: `${title.title} (${title.year})`, description: title.overview.slice(0, 155), images: [title.poster] }
  };
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [title, sessionUser, edition] = await Promise.all([getTitleBySlug(slug), getSessionUser(), getEdition()]);
  if (!title) notFound();

  const viewerId = sessionUser?.id;
  const [likes, watch, similar, reviews] = await Promise.all([
    viewerId ? prisma.titleLike.findUnique({ where: { userId_titleId_kind: { userId: viewerId, titleId: title.id, kind: 'LIKE' } } }) : null,
    viewerId ? prisma.titleLike.findUnique({ where: { userId_titleId_kind: { userId: viewerId, titleId: title.id, kind: 'WATCHLIST' } } }) : null,
    getCatalogue({ genre: title.genres[0] ?? 'All', take: 12 }),
    withViewerLikes(title.reviews, viewerId)
  ]);

  const reviewsForCards = reviews.map((r) => ({
    ...r,
    title: { id: title.id, slug: title.slug, title: title.title, year: title.year, poster: title.poster }
  }));
  const adminVerdict = reviewsForCards.find((r) => r.user?.role === 'ADMIN' || r.editorial) ?? null;
  const myReview = sessionUser ? reviewsForCards.find((r) => r.user?.email === sessionUser.email) ?? null : null;
  const related = similar.filter((t) => t.id !== title.id).slice(0, 5);
  const score = title.communityScore ?? title.tmdbScore ?? title.imdbRating ?? 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title.title,
    description: title.overview,
    datePublished: String(title.year),
    genre: title.genres,
    image: title.poster,
    director: title.director ? { '@type': 'Person', name: title.director } : undefined,
    aggregateRating:
      title.communityScore && title.reviews.length > 0
        ? { '@type': 'AggregateRating', ratingValue: title.communityScore, bestRating: 10, worstRating: 1, ratingCount: title.reviews.length }
        : undefined
  };

  return (
    <div className="container page-clip" style={{ position: 'relative' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'Movies', item: `${siteUrl}/movies` },
              { '@type': 'ListItem', position: 3, name: title.title, item: `${siteUrl}/movies/${title.slug}` }
            ]
          })
        }}
      />
      <div className="backdrop-strip" style={{ backgroundImage: `url(${title.backdrop || title.poster})` }} />

      <div className="detail-hero">
        <div className="detail-poster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={title.poster} alt={`${title.title} poster`} width={500} height={750} />
        </div>

        <div className="detail-intro">
          <div className="eyebrow">Movie · {title.year}</div>
          <h1 className="detail-title">{title.title}</h1>

          <div className="detail-meta">
            <span className="tag">{formatRuntime(title.runtime)}</span>
            {title.genres.map((g) => (
              <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`} className="tag">
                {g}
              </Link>
            ))}
            {title.tmdbScore ? <span className="tag tag-gold">★ {title.tmdbScore.toFixed(1)} TMDB</span> : null}
            <span className="tag tag-accent">{title.reviews.length} community reviews</span>
            {title.director ? <span className="tag">Dir. {title.director}</span> : null}
          </div>
        </div>

        <div className="detail-body">
          <RatingScene
            score={score}
            communityVotes={title._count.likes}
            reviewCount={title.reviews.length}
            tmdbScore={title.tmdbScore}
            myRating={myReview?.rating ?? null}
            buckets={title.ratingBuckets}
            genres={title.genres}
            runtime={title.runtime}
          />

          <p className="detail-overview">{title.overview}</p>

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
            <TrailerModal title={title.title} trailerEn={(title as any).trailerEn} trailerHi={(title as any).trailerHi} />
          </div>

          {title.cast.length > 0 ? (
            <>
              <div className="divider-line" />
              <div className="panel-title" style={{ marginBottom: 8 }}>
                <span>Top cast</span>
              </div>
              <div className="cast-grid">
                {title.cast.map((c: { name: string; role?: string; img?: string | null }) => (
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

          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="eyebrow">Community</div>
              <h2 style={{ fontSize: 24 }}>Reviews · {reviews.length}</h2>
            </div>
            <EditionSwitch current={edition} compact />
          </div>

          {reviews.length === 0 ? (
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
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-title">
              <span>Title facts</span>
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              {[
                ['Year', title.year],
                ['Runtime', formatRuntime(title.runtime)],
                ['Genres', title.genres.join(', ') || '—'],
                ['Director', title.director ?? '—'],
                ['Likes', title._count.likes],
                ['Reviews', title.reviews.length]
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="rank-poster" src={t.poster} alt="" loading="lazy" />
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
