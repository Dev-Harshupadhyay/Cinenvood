import Link from 'next/link';
import { avatarGradient, avatarSrc, cleanHeadline, hasOwnName, initials, reviewByline, timeAgo } from '@/lib/format';
import { editionOf, type Edition } from '@/lib/edition';
import LikeButton from './LikeButton';
import FeatureButton from './FeatureButton';
import SpoilerText from './SpoilerText';
import VerdictBlock from './VerdictBlock';

type Review = {
  id: string;
  rating: number;
  headline: string | null;
  headlineEn?: string | null;
  body: string;
  bodyEn?: string | null;
  spoiler: boolean;
  featured?: boolean;
  homeSpot?: boolean;
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
  edition = 'hi',
  canFeature = false
}: {
  review: Review;
  authed: boolean;
  edition?: Edition;
  /** admin hi main-page slot badal sakta hai */
  canFeature?: boolean;
}) {
  const isAdmin = review.user.role === 'ADMIN';
  const text = editionOf(review, edition);
  const isEditorial = Boolean(review.editorial);
  // Naam bhool jaane par bhi byline kabhi khaali nahi: site ke verdicts "Admin" bank jaate hain.
  const byline = reviewByline(review);
  const kind = isEditorial || review.user.role === 'ADMIN' ? 'editorial' : 'member';
  const verified = isEditorial || isAdmin;
  const supporters = review._count.likes;

  return (
    <article
      className={`review-card${verified ? ' admin-verdict' : ''}`}
      data-kind={kind}
      data-pinned={review.featured ? 'true' : undefined}
      data-home={review.homeSpot ? 'true' : undefined}
      data-editorial={isEditorial ? 'true' : undefined}
    >
      {verified ? <span className="av-quote" aria-hidden="true">“</span> : null}

      <div className="rv-head rv-head--premium">
        <span className={`avatar rv-avatar${verified ? ' avatar--admin' : ''}`} style={{ background: avatarGradient(review.user.email) }}>
          {review.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc(review.user.image) ?? ''} alt="" />
          ) : (
            initials(byline)
          )}
        </span>

        <div className="rv-id">
          <span className="rv-kicker">
            <span className="rv-kicker-line" aria-hidden="true" />
            Review by
          </span>
          <div className="rv-name rv-name--lg">
            {byline}
            {verified ? (
              <span className="rv-verified" title="Verified editorial voice">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.6l2.3 1.9 3-.3 1.1 2.8 2.6 1.5-1 2.8 1 2.8-2.6 1.5-1.1 2.8-3-.3L12 21.4l-2.3-1.9-3 .3-1.1-2.8L3 15.5l1-2.8-1-2.8 2.6-1.5 1.1-2.8 3 .3L12 2.6z" />
                </svg>
              </span>
            ) : null}
            {!verified && !hasOwnName(review.user.name) ? <span className="rv-name-hint">name not set</span> : null}
          </div>
          <div className="rv-role">
            {isEditorial ? (
              <span className="rv-role-chip rv-role-chip--gold">FOUNDER · EDITOR-IN-CHIEF</span>
            ) : review.user.role === 'ADMIN' ? (
              <span className="rv-role-chip rv-role-chip--gold">ADMIN VERDICT</span>
            ) : (
              <span className="rv-role-plain">Member review</span>
            )}
            {review.homeSpot ? <span className="rv-home-chip">★ On home</span> : null}
            <span className="rv-dot" aria-hidden="true">·</span>
            <span className="rv-time">{timeAgo(review.createdAt)}</span>
            {text.translated ? (
              <span className="rv-trans" title="Original written in Hinglish">
                EN edition
              </span>
            ) : null}
          </div>
        </div>

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
        {isEditorial ? (
          <span className="av-pin av-pin--gold">VERDICT</span>
        ) : review.featured ? (
          <span className="av-pin">PINNED</span>
        ) : null}
      </Link>

      {(cleanHeadline(text.headline) || cleanHeadline(review.headlineEn)) ? (
        <h3 className="rv-headline rv-headline--serif">
          {cleanHeadline(text.headline) || cleanHeadline(review.headlineEn)}
        </h3>
      ) : null}

      {review.spoiler ? (
        <SpoilerText text={text.body} />
      ) : (
        <p className={`rv-body${isEditorial ? ' rv-body--editorial rv-body--clamp' : ''}`}>{text.body}</p>
      )}

      {/* score comes AFTER the review so the words get read first */}
      <VerdictBlock rating={review.rating} size="card" />

      <div className="rv-foot">
        <LikeButton
          reviewId={review.id}
          initialCount={review._count.likes}
          initialLiked={Boolean(review.likedByViewer)}
          authed={authed}
          label="Agree"
        />

        <Link href={`/reviews/${review.id}`} className="btn btn-sm btn-ghost rv-replies">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
          </svg>
          {review._count.comments}
          <span className="rv-agree-label">{review._count.comments === 1 ? 'reply' : 'replies'}</span>
        </Link>

        {supporters > 0 ? (
          <span className="rv-supported">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.1 12 21 12 21z" />
            </svg>
            {supporters} supported
          </span>
        ) : null}

        {verified ? <span className="av-sign">— {byline}</span> : null}

        {canFeature ? <FeatureButton reviewId={review.id} on={Boolean(review.homeSpot)} /> : null}

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
