import Link from 'next/link';
import ReviewCard from '@/components/ReviewCard';
import { getSessionUser } from '@/lib/session';
import { getLatestReviews, getTopReviews, getCatalogue, withViewerLikes } from '@/lib/queries';
import { getEdition } from '@/lib/edition';
import { settle, settleAll } from '@/lib/safe';
import DataBanner from '@/components/DataBanner';
import EditionSwitch from '@/components/EditionSwitch';
import GuestNote from '@/components/GuestNote';

export const metadata = {
  title: 'Reviews',
  description: 'Editorial verdicts and community reviews — the newest takes on the CINE·MOOD feed.',
  alternates: { canonical: '/reviews' },
  openGraph: { title: 'Reviews · CINE·MOOD', description: 'Editorial verdicts and community reviews.' }
};

export default async function ReviewsFeed({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort = 'recent' } = await searchParams;
  const sessionUser = await getSessionUser();
  const edition = await getEdition();

  const settled = await settleAll(
    [getLatestReviews(30), getTopReviews(1), getCatalogue({ sort: 'rating', take: 6 })],
    [[], [], []]
  );
  const [rowsRaw, pickRaw, topRaw] = settled.data as [
    Awaited<ReturnType<typeof getLatestReviews>>,
    Awaited<ReturnType<typeof getTopReviews>>,
    Awaited<ReturnType<typeof getCatalogue>>
  ];

  const withLikes = await withViewerLikes(rowsRaw, sessionUser?.id).catch(() => rowsRaw);
  const list = sort === 'top' ? [...withLikes].sort((a, b) => b._count.likes - a._count.likes) : withLikes;
  const pick = pickRaw[0];

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 46 }}>
      <DataBanner message={settled.error} />

      <div className="section-head">
        <div>
          <div className="eyebrow">Community feed</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>Every verdict, in one place</h1>
          <p className="sub">
            {list.length} published {list.length === 1 ? 'review' : 'reviews'} · editorial + community · spoilers clearly tagged
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <EditionSwitch current={edition} />
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

      {!sessionUser ? <GuestNote what="like, comment ya apni review post" /> : null}

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <b>Feed khali hai</b>
          Pehli review likho aur shuruaat karo.
        </div>
      ) : (
        <div className="feed-layout" style={{ marginTop: 18 }}>
          <div className="review-list review-list--wide">
            {list.map((r) => (
              <ReviewCard key={r.id} review={r as any} authed={Boolean(sessionUser)} edition={edition} />
            ))}
          </div>

          <aside className="feed-rail">
            {pick ? (
              <div className="rail-card">
                <div className="rail-title">
                  <span>Editor&apos;s pick</span>
                  <span style={{ color: 'var(--accent-bright)' }}>{pick.rating}/10</span>
                </div>
                <Link href={`/reviews/${pick.id}`} style={{ display: 'flex', gap: 11, textDecoration: 'none', color: 'inherit' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pick.title.poster} alt="" style={{ width: 56, height: 80, borderRadius: 9, objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontVariant: 'small-caps', letterSpacing: '0.01em', fontSize: 17, lineHeight: 1.2 }}>
                      {pick.headline || pick.title.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--faint)', marginTop: 5 }}>
                      {pick.title.title.toUpperCase()} · {pick.title.year}
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}

            <div className="rail-card">
              <div className="rail-title">
                <span>Highest rated</span>
                <Link href="/movies?sort=rating" style={{ color: 'var(--accent-bright)', fontSize: 9 }}>ALL →</Link>
              </div>
              {topRaw.map((t: any) => (
                <Link key={t.slug} href={`/movies/${t.slug}`} className="rail-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.poster} alt="" loading="lazy" />
                  <div style={{ minWidth: 0 }}>
                    <div className="ri-title">{t.title}</div>
                    <div className="ri-sub">{t.year} · {(t.communityScore ?? t.tmdbScore ?? '—')}/10</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="rail-card">
              <div className="rail-title"><span>How editions work</span></div>
              <p className="rail-note">
                India se kholo to verdict <b>Hinglish</b> mein, bahar se kholo to <b>English</b> edition — same review, same opinion.
                Upar ke switch se aap khud bhi badal sakte ho.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
