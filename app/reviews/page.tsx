import Link from 'next/link';
import ReviewCard from '@/components/ReviewCard';
import { getSessionUser } from '@/lib/session';
import { getLatestReviews, withViewerLikes } from '@/lib/queries';

export const metadata = { title: 'Reviews' };

export default async function ReviewsFeed({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort = 'recent' } = await searchParams;
  const sessionUser = await getSessionUser();
  const rows = await getLatestReviews(30);
  const withLikes = await withViewerLikes(rows, sessionUser?.id);
  const list = sort === 'top' ? [...withLikes].sort((a, b) => b._count.likes - a._count.likes) : withLikes;

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 40 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Community feed</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>Every verdict, in one place</h1>
          <p className="sub">{list.length} published reviews · spoilers clearly tagged</p>
        </div>
        <div className="tabs">
          <Link href="/reviews?sort=recent" data-active={sort === 'recent'}>
            Recent
          </Link>
          <Link href="/reviews?sort=top" data-active={sort === 'top'}>
            Most liked
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <b>Feed khali hai</b>
          Pehli review likho aur shuruaat karo.
        </div>
      ) : (
        <div className="review-list" style={{ maxWidth: 780 }}>
          {list.map((r) => (
            <ReviewCard key={r.id} review={r as any} authed={Boolean(sessionUser)} />
          ))}
        </div>
      )}
    </div>
  );
}
