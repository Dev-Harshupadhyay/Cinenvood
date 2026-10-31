import Link from 'next/link';
import PosterCard from '@/components/PosterCard';
import ReviewCard from '@/components/ReviewCard';
import ProfileForm from '@/components/ProfileForm';
import { displayName } from '@/lib/format';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getCatalogue, withViewerLikes } from '@/lib/queries';
import { avatarGradient, initials } from '@/lib/format';

export const metadata = { title: 'Dashboard' };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reviews', label: 'My reviews' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'profile', label: 'Profile' }
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab = 'overview' } = await searchParams;

  const [myReviews, likedTitles, watchTitles, likesReceived, commentsMade] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
        title: { select: { id: true, slug: true, title: true, year: true, poster: true } },
        _count: { select: { likes: true, comments: true } }
      }
    }),
    prisma.titleLike.findMany({
      where: { userId: user.id, kind: 'LIKE' },
      include: { title: { include: { reviews: { where: { status: 'PUBLISHED', editorial: false }, select: { rating: true } }, _count: { select: { reviews: { where: { status: 'PUBLISHED', editorial: false } }, likes: true } } } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.titleLike.findMany({
      where: { userId: user.id, kind: 'WATCHLIST' },
      include: { title: { include: { reviews: { where: { status: 'PUBLISHED', editorial: false }, select: { rating: true } }, _count: { select: { reviews: { where: { status: 'PUBLISHED', editorial: false } }, likes: true } } } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.reviewLike.count({ where: { review: { userId: user.id } } }),
    prisma.comment.count({ where: { userId: user.id } })
  ]);

  const reviewsWithLikes = await withViewerLikes(myReviews, user.id);
  const catalogue = await getCatalogue({ take: 60 });

  const toPoster = (row: (typeof likedTitles)[number]) => {
    const t = row.title;
    const ratings = t.reviews.map((r) => r.rating);
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      year: t.year,
      runtime: t.runtime,
      poster: t.poster,
      genres: JSON.parse(t.genres),
      imdbRating: t.imdbRating,
      tmdbScore: t.tmdbScore ?? null,
      reviewCount: t._count.reviews,
      likes: t._count.likes,
      communityScore: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null
    };
  };

  return (
    <div className="container dash">
      <aside className="dash-side">
        <div className="panel" style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <span className="avatar" style={{ background: avatarGradient(user.email), width: 42, height: 42 }}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" />
            ) : (
              initials(user.name ?? user.email)
            )}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 650, fontSize: 14 }}>{displayName(user.name, user.email)}</span>
            {!user.name?.trim() ? (
              <span className="name-nudge">
                Naam set karo — review par yahi byline dikhega.{' '}
                <a href="/dashboard?tab=profile">Add name →</a>
              </span>
            ) : null}
            <span className="faint mono" style={{ fontSize: 10 }}>
              {user.role === 'ADMIN' ? 'CURATOR' : 'MEMBER'}
            </span>
          </span>
        </div>

        <div className="panel dash-nav">
          {TABS.map((t) => (
            <Link key={t.key} href={`/dashboard?tab=${t.key}`} data-active={tab === t.key}>
              {t.label}
            </Link>
          ))}
          {user.role === 'ADMIN' ? (
            <Link href="/admin">
              Admin panel
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ marginLeft: 'auto' }} aria-hidden="true">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </Link>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>Recommended</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catalogue.slice(0, 3).map((t) => (
              <Link key={t.id} href={`/movies/${t.slug}`} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.poster} alt="" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 6 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span className="faint mono" style={{ fontSize: 10 }}>{t.year}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="sl">Reviews</div>
            <div className="sv">{myReviews.length}</div>
            <div className="sd">published verdicts</div>
          </div>
          <div className="stat-card">
            <div className="sl">Likes received</div>
            <div className="sv">{likesReceived}</div>
            <div className="sd">across your reviews</div>
          </div>
          <div className="stat-card">
            <div className="sl">Comments</div>
            <div className="sv">{commentsMade}</div>
            <div className="sd">in discussions</div>
          </div>
          <div className="stat-card">
            <div className="sl">Watchlist</div>
            <div className="sv">{watchTitles.length}</div>
            <div className="sd">titles saved</div>
          </div>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="panel">
              <div className="panel-title">
                <span>Recent activity</span>
                <Link href="/dashboard?tab=reviews" className="link-more">
                  All reviews
                </Link>
              </div>
              {reviewsWithLikes.length === 0 ? (
                <div className="empty">
                  <b>Abhi koi review nahi</b>
                  Koi bhi movie kholo aur apna pehla verdict likho.
                  <div style={{ marginTop: 14 }}>
                    <Link href="/movies" className="btn btn-primary btn-sm">
                      Browse movies
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="review-list">
                  {reviewsWithLikes.slice(0, 2).map((r) => (
                    <ReviewCard key={r.id} review={r as any} authed edition="hi" />
                  ))}
                </div>
              )}
            </div>

            {likedTitles.length > 0 ? (
              <div className="panel">
                <div className="panel-title">
                  <span>Liked titles</span>
                  <Link href="/dashboard?tab=watchlist" className="link-more">
                    Watchlist
                  </Link>
                </div>
                <div className="grid-posters" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
                  {likedTitles.slice(0, 5).map((row) => (
                    <PosterCard key={row.id} title={toPoster(row)} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === 'reviews' ? (
          <div className="panel">
            <div className="panel-title">
              <span>Your reviews · {reviewsWithLikes.length}</span>
            </div>
            {reviewsWithLikes.length === 0 ? (
              <div className="empty">
                <b>No reviews yet</b>
                Write one from any movie page.
              </div>
            ) : (
              <div className="review-list">
                {reviewsWithLikes.map((r) => (
                  <ReviewCard key={r.id} review={r as any} authed edition="hi" />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'watchlist' ? (
          <>
            <div className="panel">
              <div className="panel-title">
                <span>Watchlist · {watchTitles.length}</span>
              </div>
              {watchTitles.length === 0 ? (
                <div className="empty">
                  <b>Watchlist khali hai</b>
                  Movie page pe “Watchlist” dabao.
                </div>
              ) : (
                <div className="grid-posters" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
                  {watchTitles.map((row) => (
                    <PosterCard key={row.id} title={toPoster(row)} />
                  ))}
                </div>
              )}
            </div>
            {likedTitles.length > 0 ? (
              <div className="panel">
                <div className="panel-title">
                  <span>Liked movies · {likedTitles.length}</span>
                </div>
                <div className="grid-posters" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
                  {likedTitles.map((row) => (
                    <PosterCard key={row.id} title={toPoster(row)} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === 'profile' ? <ProfileForm
          name={user.name ?? ''}
          bio={user.bio ?? ''}
          image={user.image ?? null}
          googleImage={user.googleImage ?? null}
          email={user.email}
        /> : null}
      </div>
    </div>
  );
}
