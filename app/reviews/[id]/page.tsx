import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Comments from '@/components/Comments';
import LikeButton from '@/components/LikeButton';
import SpoilerText from '@/components/SpoilerText';
import VerdictBlock from '@/components/VerdictBlock';
import { getSessionUser } from '@/lib/session';
import { getReview, getLatestReviews, withViewerLikes } from '@/lib/queries';
import { avatarGradient, initials, timeAgo, reviewByline, cleanHeadline } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEdition, editionOf } from '@/lib/edition';
import EditionSwitch from '@/components/EditionSwitch';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const review = await getReview(id);
  // throw before the shell streams so crawlers get a real 404
  if (!review) notFound();
  return {
    title: `${review.title.title} — ${review.rating}/10`,
    description: review.body.replace(/\s+/g, ' ').slice(0, 150),
    alternates: { canonical: `/reviews/${review.id}` },
    openGraph: {
      type: 'article',
      title: `${review.title.title} — ${review.rating}/10`,
      description: review.body.replace(/\s+/g, ' ').slice(0, 150),
      images: [review.title.poster]
    }
  };
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [review, sessionUser, edition] = await Promise.all([getReview(id), getSessionUser(), getEdition()]);
  if (!review || review.status === 'HIDDEN') notFound();

  const [liked, more] = await Promise.all([
    sessionUser
      ? prisma.reviewLike.findUnique({ where: { userId_reviewId: { userId: sessionUser.id, reviewId: review.id } } })
      : null,
    getLatestReviews(4, { excludeTitleId: review.titleId })
  ]);
  const moreWithLikes = await withViewerLikes(more, sessionUser?.id);

  const text = editionOf(review, edition);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Review',
        itemReviewed: { '@type': 'Movie', name: review.title.title, datePublished: String(review.title.year), image: review.title.poster },
        reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 10, worstRating: 1 },
        name: cleanHeadline(review.headline) || `${review.title.title} review`,
        reviewBody: text.body.slice(0, 500),
        author: { '@type': review.editorial ? 'Organization' : 'Person', name: reviewByline(review) },
        datePublished: new Date(review.createdAt).toISOString(),
        publisher: { '@type': 'Organization', name: 'CINE·MOOD' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${siteUrl}/reviews` },
          { '@type': 'ListItem', position: 3, name: review.title.title, item: `${siteUrl}/movies/${review.title.slug}` }
        ]
      }
    ]
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="split">
        <article>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <Link href={`/movies/${review.title.slug}`} className="link-more" style={{ display: 'inline-flex' }}>
              ← {review.title.title} ({review.title.year})
            </Link>
            {review.bodyEn ? <EditionSwitch current={edition} compact /> : null}
          </div>

          <div className="review-card" style={{ padding: 24 }}>
            <div className="rv-head">
              <span className="avatar" style={{ background: avatarGradient(review.user.email) }}>
                {review.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={review.user.image} alt="" />
                ) : (
                  initials(reviewByline(review))
                )}
              </span>
              <div className="rv-id">
                <div className="rv-name">
                  {reviewByline(review)}
                  {review.editorial ? <span className="mini-badge" style={{ marginLeft: 8 }}>EDITORIAL</span> : null}
                </div>
                <div className="rv-time">
                  {timeAgo(review.createdAt)} · {review.status.toLowerCase()}
                  {review.editorial ? ' · written by the site' : ''}
                </div>
              </div>
            </div>

            {(cleanHeadline(text.headline) || cleanHeadline(review.headlineEn)) ? (
              <h1 className="rv-detail-headline">
                {cleanHeadline(text.headline) || cleanHeadline(review.headlineEn)}
              </h1>
            ) : null}
            {text.translated ? (
              <div className="rv-detail-langs">
                <span className="rv-trans">EN edition</span>
                <span className="faint mono" style={{ fontSize: 10 }}>original in Hinglish</span>
              </div>
            ) : null}

            {review.spoiler ? (
              <SpoilerText text={text.body} className="rv-body-full" />
            ) : (
              <p className={`rv-body-full${review.editorial ? ' rv-body--editorial' : ''}`}>{text.body}</p>
            )}

            <VerdictBlock rating={review.rating} size="full" />

            <div className="rv-foot">
              <LikeButton
                reviewId={review.id}
                initialCount={review._count.likes}
                initialLiked={Boolean(liked)}
                authed={Boolean(sessionUser)}
              />
              <span className="chip" style={{ cursor: 'default' }}>
                {review.comments.length} {review.comments.length === 1 ? 'comment' : 'comments'}
              </span>
              <Link href={`/movies/${review.title.slug}`} className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
                Rate this film
              </Link>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <Comments
              reviewId={review.id}
              initial={review.comments as any}
              authed={Boolean(sessionUser)}
              me={sessionUser ? { name: sessionUser.name ?? null, email: sessionUser.email! } : null}
            />
          </div>
        </article>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-title">
              <span>About the film</span>
            </div>
            <Link href={`/movies/${review.title.slug}`} style={{ display: 'flex', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={review.title.poster} alt="" style={{ width: 78, borderRadius: 10, border: '1px solid var(--border)' }} />
              <span>
                <span style={{ display: 'block', fontWeight: 650 }}>{review.title.title}</span>
                <span className="faint mono" style={{ fontSize: 11 }}>
                  {review.title.year}
                </span>
              </span>
            </Link>
          </div>

          <div className="panel">
            <div className="panel-title">
              <span>More reviews</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {moreWithLikes.map((r) => (
                <Link key={r.id} href={`/reviews/${r.id}`} style={{ display: 'flex', gap: 10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.title.poster} alt="" className="rank-poster" style={{ width: 36, height: 52 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title.title}
                    </span>
                    <span className="faint mono" style={{ fontSize: 10.5 }}>
                      {r.rating}/10 · {r._count.likes} likes
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
