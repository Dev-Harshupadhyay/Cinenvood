import Link from 'next/link';
import { avatarGradient, initials, timeAgo } from '@/lib/format';
import LikeButton from './LikeButton';
import SpoilerText from './SpoilerText';

type Review = {
  id: string;
  rating: number;
  headline: string | null;
  body: string;
  spoiler: boolean;
  featured?: boolean;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string; image: string | null; role?: string };
  title: { id: string; slug: string; title: string; year: number; poster: string };
  _count: { likes: number; comments: number };
  likedByViewer?: boolean;
};

export default function ReviewCard({ review, authed }: { review: Review; authed: boolean }) {
  const isAdmin = review.user.role === 'ADMIN';

  return (
    <article className={`review-card${isAdmin ? ' admin-verdict' : ''}`} data-pinned={review.featured ? 'true' : undefined}>
      {isAdmin ? <span className="av-quote" aria-hidden="true">“</span> : null}

      <div className="rv-head">
        <span className={`avatar${isAdmin ? ' avatar--admin' : ''}`} style={{ background: avatarGradient(review.user.email) }}>
          {review.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.user.image} alt="" />
          ) : (
            initials(review.user.name ?? review.user.email)
          )}
        </span>
        <div className="rv-id">
          <div className="rv-name">
            {review.user.name ?? 'Member'}
            {isAdmin ? <span className="av-crown" aria-hidden="true">✦</span> : null}
          </div>
          {isAdmin ? (
            <div className="av-meta">
              <span className="av-dot" aria-hidden="true" />
              ADMIN VERDICT · FOUNDER &amp; EDITOR
            </div>
          ) : (
            <div className="rv-time">{timeAgo(review.createdAt)}</div>
          )}
        </div>
        <span className={`rv-rating${isAdmin ? ' rv-rating--admin' : ''}`}>
          {review.rating}
          <small>/10</small>
        </span>
      </div>

      <Link href={`/movies/${review.title.slug}`} className="rv-movie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review.title.poster} alt="" loading="lazy" />
        <div>
          <div className="rm-title">{review.title.title}</div>
          <div className="rm-meta">
            {review.title.year} · {review._count.comments} {review._count.comments === 1 ? 'comment' : 'comments'}
            {isAdmin ? ` · ${timeAgo(review.createdAt)}` : ''}
          </div>
        </div>
        {review.featured ? <span className="av-pin">PINNED</span> : null}
      </Link>

      {review.headline ? <h3 className="rv-headline">{review.headline}</h3> : null}

      {review.spoiler ? (
        <SpoilerText text={review.body} />
      ) : (
        <p className="rv-body">{review.body}</p>
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
          Read
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M5 12h14m0 0-6-6m6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
