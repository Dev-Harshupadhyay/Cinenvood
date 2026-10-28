import Link from 'next/link';
import ReviewCard from '@/components/ReviewCard';
import { getSessionUser } from '@/lib/session';
import { getPlatformStats, getTopMembers, getTopReviews, withViewerLikes } from '@/lib/queries';
import { avatarGradient, initials } from '@/lib/format';

export const metadata = { title: 'Community' };

export default async function CommunityPage() {
  const sessionUser = await getSessionUser();
  const [stats, members, topRaw] = await Promise.all([getPlatformStats(), getTopMembers(8), getTopReviews(4)]);
  const top = await withViewerLikes(topRaw, sessionUser?.id);

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Community</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>The people behind the verdicts</h1>
          <p className="sub">Reviews, likes aur comments — sab ek hi jagah.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          ['Members', stats.users, 'signed in'],
          ['Reviews', stats.reviews, 'published'],
          ['Likes', stats.likes, 'on reviews'],
          ['Comments', stats.comments, 'in threads'],
          ['Titles', stats.titles, 'in catalogue'],
          ['Watchlists', stats.watchlists, 'saved titles']
        ].map(([label, value, sub]) => (
          <div key={label as string} className="stat-card">
            <div className="sl">{label}</div>
            <div className="sv">{value as number}</div>
            <div className="sd">{sub as string}</div>
          </div>
        ))}
      </div>

      <div className="split">
        <div>
          <div className="section-head">
            <div>
              <div className="eyebrow">Most liked</div>
              <h2 style={{ fontSize: 24 }}>Top reviews</h2>
            </div>
            <Link href="/reviews?sort=top" className="link-more">
              All
            </Link>
          </div>
          <div className="review-list">
            {top.map((r) => (
              <ReviewCard key={r.id} review={r as any} authed={Boolean(sessionUser)} />
            ))}
          </div>
        </div>

        <aside>
          <div className="panel">
            <div className="panel-title">
              <span>Top reviewers</span>
            </div>
            {members.map((m, i) => (
              <div key={m.id} className="member-row">
                <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="avatar" style={{ background: avatarGradient(m.email), width: 32, height: 32, fontSize: 11 }}>
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" />
                  ) : (
                    initials(m.name ?? m.email)
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="mr-name" style={{ display: 'block' }}>
                    {m.name ?? 'Member'} {m.role === 'ADMIN' ? <span className="tag tag-accent" style={{ marginLeft: 4 }}>curator</span> : null}
                  </span>
                  <span className="mr-meta">{m.bio ? m.bio.slice(0, 34) : 'Member'}</span>
                </span>
                <span className="mr-count">{m._count.reviews} reviews</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
