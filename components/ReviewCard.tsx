import Link from 'next/link';
import { verdictFor } from '@/lib/verdict';
import { avatarGradient, initials, timeAgo } from '@/lib/format';
import { editionOf, type Edition } from '@/lib/edition';
import LikeButton from './LikeButton';
import SpoilerText from './SpoilerText';

type Review = {
  id: string;
  rating: number;
  headline: string | null;
  headlineEn?: string | null;
  body: string;
  bodyEn?: string | null;
  spoiler: boolean;
  featured?: boolean;
  editorial?: boolean;
  authorName?: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string; image: string | null; role?: string };
  title: { id: string; slug: string; title: string; year: number; poster: string };
  _count: { likes: number; comments: number };
  likedByViewer?: boolean;
};

export default function ReviewCard({
  review,
  authed,
  edition = 'hi'
}: {
  review: Review;
  authed: boolean;
  edition?: Edition;
}) {
  const isAdmin = review.user.role === 'ADMIN';
  const text = editionOf(review, edition);
  const isEditorial = Boolean(review.editorial);
  const band = verdictFor(review.rating);
  const byline = isEditorial ? review.authorName || review.user.name || 'Harsh' : review.user.name ?? 'Member';

  return (
    <article
      className={`review-card${isAdmin ? ' admin-verdict' : ''}`}
      data-pinned={review.featured ? 'true' : undefined}
      data-editorial={isEditorial ? 'true' : undefined}
    >
      {isAdmin ? <span className="av-quote" aria-hidden="true">“</span> : null}

      <div className="rv-head rv-head--premium">
        <span className={`avatar rv-avatar${isAdmin ? ' avatar--admin' : ''}`} style={{ background: avatarGradient(review.user.email) }}>
          {review.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.user.image} alt="" />
          ) : (
            initials(byline)
          )}
        </span>

        <div className="rv-id">
          <div className="rv-name rv-name--lg">
            {byline}
            {isAdmin ? <span className="av-crown" aria-hidden="true">✦</span> : null}
          </div>
          <div className="rv-role">
            {isEditorial ? (
              <span className="rv-role-chip">EDITORIAL · CiNEMAsFLiX</span>
            ) : isAdmin ? (
              <span className="rv-role-chip">FOUNDER &amp; EDITOR</span>
            ) : (
              <span className="rv-role-plain">Member review</span>
            )}
            <span className="rv-dot" aria-hidden="true">·</span>
            <span className="rv-time">{timeAgo(review.createdAt)}</span>
            {text.translated ? (
              <span className="rv-trans" title="Original written in Hinglish">
                EN edition
              </span>
            ) : null}
          </div>
        </div>

        <span className={`rv-rating rv-rating--big${isAdmin ? ' rv-rating--admin' : ''}`}>
          <span className="rv-num">
            {review.rating}
            <small>/10</small>
          </span>
          <em className="rv-band" data-tone={band.tone}>
            {band.short}
          </em>
        </span>
      </div>

      <Link href={`/movies/${review.title.slug}`} className="rv-movie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review.title.poster} alt="" loading="lazy" />
        <div>
          <div className="rm-title">{review.title.title}</div>
          <div className="rm-meta">
            {review.title.year} · {review._count.comments} {review._count.comments === 1 ? 'comment' : 'comments'}
          </div>
        </div>
        {review.featured ? <span className="av-pin">PINNED</span> : null}
      </Link>

      {text.headline ? <h3 className="rv-headline rv-headline--serif">{text.headline}</h3> : null}

      {review.spoiler ? (
        <SpoilerText text={text.body} />
      ) : (
        <p className={`rv-body${isEditorial ? ' rv-body--editorial rv-body--clamp' : ''}`}>{text.body}</p>
      )}

      <div className="rv-foot">
        <LikeButton
          reviewId={review.id}
          initialCount={review._count.likes}
          initialLiked={Boolean(review.likedByViewer)}
          authed={authed}
        />
        <Link href={`/reviews/${review.id}`} className="btn btn-sm btn-ghost">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
          </svg>
          {review._count.comments}
        </Link>
        {isAdmin ? <span className="av-sign">— Harsh</span> : null}
        <Link href={`/reviews/${review.id}`} className="link-more" style={{ marginLeft: 'auto' }}>
          Read full verdict
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M5 12h14m0 0-6-6m6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
