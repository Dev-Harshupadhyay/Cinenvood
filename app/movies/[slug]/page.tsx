import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PosterCard from '@/components/PosterCard';
import ReviewCard from '@/components/ReviewCard';
import ReviewComposer from '@/components/ReviewComposer';
import TitleActions from '@/components/TitleActions';
import { getSessionUser } from '@/lib/session';
import { getCatalogue, getTitleBySlug, withViewerLikes } from '@/lib/queries';
import { avatarGradient, formatRuntime, initials } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) return { title: 'Not found' };
  return {
    title: `${title.title} (${title.year})`,
    description: title.overview.slice(0, 155),
    alternates: { canonical: `/movies/${title.slug}` },
    openGraph: { title: `${title.title} (${title.year})`, description: title.overview.slice(0, 155), images: [title.poster] }
  };
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [title, sessionUser] = await Promise.all([getTitleBySlug(slug), getSessionUser()]);
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
  const adminVerdict = reviewsForCards.find((r) => r.user.role === 'ADMIN') ?? null;
  const myReview = sessionUser ? reviewsForCards.find((r) => r.user.email === sessionUser.email) ?? null : null;
  const related = similar.filter((t) => t.id !== title.id).slice(0, 5);
  const score = title.communityScore ?? title.imdbRating ?? 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title.title,
    description: title.overview,
    datePublished: String(title.year),
    genre: title.genres,
    image: title.poster,
    director: title.director ? { '@type': 'Person', name: title.director } : undefined,
    aggregateRating: title.communityScore
      ? { '@type': 'AggregateRating', ratingValue: title.communityScore, bestRating: 10, ratingCount: Math.max(title.reviews.length, 1) }
      : undefined
  };

  return (
    <div className="container page-clip" style={{ position: 'relative' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
            {title.imdbRating ? <span className="tag tag-gold">★ {title.imdbRating.toFixed(1)} TMDB</span> : null}
            <span className="tag tag-accent">{title.reviews.length} community reviews</span>
            {title.director ? <span className="tag">Dir. {title.director}</span> : null}
          </div>
        </div>

        <div className="detail-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
            <div className="score-ring" style={{ ['--val' as string]: score * 10, ['--size' as string]: '78px' }}>
              <div>
                <b style={{ fontSize: 21 }}>{score ? score.toFixed(1) : '—'}</b>
                <span>mood</span>
              </div>
            </div>
            <div style={{ minWidth: 190 }}>
              <div className="dist">
                {title.ratingBuckets.slice(0, 5).map((b) => {
                  const max = Math.max(1, ...title.ratingBuckets.map((x) => x.count));
                  return (
                    <div key={b.rating} className="dist-row">
                      <span className="dr-label">{b.rating}</span>
                      <span className="dist-bar">
                        <i style={{ width: `${(b.count / max) * 100}%` }} />
                      </span>
                      <span className="dr-count">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

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
          </div>

          {title.cast.length > 0 ? (
            <>
              <div className="divider-line" />
              <div className="panel-title" style={{ marginBottom: 8 }}>
                <span>Top cast</span>
              </div>
              <div className="cast-row">
                {title.cast.map((c) => (
                  <span key={c.name} className="cast-chip">
                    <span className="avatar" style={{ background: avatarGradient(c.name) }}>
                      {initials(c.name)}
                    </span>
                    {c.name}
                  </span>
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
          </div>

          {reviews.length === 0 ? (
            <div className="empty">
              <b>No reviews yet</b>
              Pehla verdict tumhara ho sakta hai.
            </div>
          ) : (
            <div className="review-list">
              {reviewsForCards.map((r) => (
                <ReviewCard key={r.id} review={r as any} authed={Boolean(sessionUser)} />
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
                  <span className="rank-score">{(t.communityScore ?? t.imdbRating ?? 0).toFixed(1)}</span>
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
