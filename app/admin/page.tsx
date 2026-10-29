import Link from 'next/link';
import AdminButton from '@/components/AdminButton';
import TmdbImport from '@/components/TmdbImport';
import EditorialEditor from '@/components/EditorialEditor';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getAnalytics } from '@/lib/queries';
import { withAuthors } from '@/lib/reviews';
import { tmdbConfigured } from '@/lib/tmdb';
import { avatarGradient, initials, timeAgo } from '@/lib/format';

export const metadata = { title: 'Admin' };

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'titles', label: 'Titles' },
  { key: 'users', label: 'Users' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'activity', label: 'Activity log' },
  { key: 'import', label: 'TMDB import' }
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdmin();
  const { tab = 'overview' } = await searchParams;

  const [users, titles, reviews, pending, comments, likes, recentUsers, recentComments, topReviews] = await Promise.all([
    prisma.user.count(),
    prisma.title.count(),
    prisma.review.count(),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.comment.count(),
    prisma.reviewLike.count(),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { _count: { select: { reviews: true } } } }),
    prisma.comment.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true, email: true } }, review: { select: { id: true, headline: true } } } }),
    prisma.review.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ featured: 'desc' }, { likes: { _count: 'desc' } }],
      take: 5,
      include: {
        user: { select: { name: true, role: true } },
        title: { select: { title: true, slug: true } },
        _count: { select: { likes: true, comments: true } }
      }
    })
  ]);

  const pendingReviews =
    tab === 'moderation'
      ? withAuthors(await prisma.review.findMany({
          where: { status: { in: ['PENDING', 'PUBLISHED'] } },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 40,
          include: {
            user: { select: { name: true, email: true } },
            title: { select: { title: true, slug: true, poster: true } },
            _count: { select: { likes: true, comments: true } }
          }
        }))
      : [];

  const allTitles =
    tab === 'titles'
      ? await prisma.title.findMany({
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          include: { _count: { select: { reviews: true, likes: true } } }
        })
      : [];

  const analytics = tab === 'analytics' ? await getAnalytics() : null;

  const editorialRows =
    tab === 'editorial'
      ? (
          await prisma.review.findMany({
            where: { editorial: true },
            orderBy: { createdAt: 'desc' },
            include: { title: { select: { id: true, title: true, year: true } } }
          })
        ).map((r) => ({
          id: r.id,
          rating: r.rating,
          headline: r.headline,
          body: r.body,
          headlineEn: r.headlineEn,
          bodyEn: r.bodyEn,
          featured: r.featured,
          titleId: r.titleId,
          titleName: r.title.title,
          year: r.title.year
        }))
      : [];

  const titleOptions =
    tab === 'editorial'
      ? await prisma.title.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, title: true, year: true }, orderBy: { title: 'asc' }, take: 300 })
      : [];

  const adminLog =
    tab === 'activity'
      ? await prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
      : [];

  const editorialCount = await prisma.review.count({ where: { editorial: true } });

  const allUsers =
    tab === 'users'
      ? await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { reviews: true, comments: true } } } })
      : [];

  return (
    <div className="container dash">
      <aside className="dash-side">
        <div className="panel" style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <span className="avatar" style={{ background: avatarGradient(admin.email), width: 42, height: 42 }}>
            {admin.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={admin.image} alt="" />
            ) : (
              initials(admin.name ?? admin.email)
            )}
          </span>
          <span>
            <span style={{ display: 'block', fontWeight: 650, fontSize: 14 }}>{admin.name ?? 'Admin'}</span>
            <span className="faint mono" style={{ fontSize: 10 }}>CURATOR · ADMIN</span>
          </span>
        </div>

        <div className="panel dash-nav">
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin?tab=${t.key}`} data-active={tab === t.key}>
              {t.label}
              {t.key === 'moderation' && pending > 0 ? (
                <span className="status status-pending" style={{ marginLeft: 'auto' }}>
                  {pending}
                </span>
              ) : null}
            </Link>
          ))}
          <Link href="/dashboard" style={{ marginTop: 4 }}>
            ← My dashboard
          </Link>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>Quick links</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link href="/" className="link-more">
              Public site →
            </Link>
            <Link href="/admin?tab=import" className="link-more">
              Import a title →
            </Link>
            <Link href="/admin?tab=moderation" className="link-more">
              Clear queue →
            </Link>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="sl">Users</div>
            <div className="sv">{users}</div>
            <div className="sd">registered</div>
          </div>
          <div className="stat-card">
            <div className="sl">Titles</div>
            <div className="sv">{titles}</div>
            <div className="sd">in catalogue</div>
          </div>
          <div className="stat-card">
            <div className="sl">Reviews</div>
            <div className="sv">{reviews}</div>
            <div className="sd">{pending} pending</div>
          </div>
          <div className="stat-card">
            <div className="sl">Engagement</div>
            <div className="sv">{likes + comments}</div>
            <div className="sd">{likes} likes · {comments} comments</div>
          </div>
          <div className="stat-card">
            <div className="sl">Editorial</div>
            <div className="sv">{editorialCount}</div>
            <div className="sd">legacy + admin verdicts</div>
          </div>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="panel">
              <div className="panel-title">
                <span>Needs attention</span>
                <Link href="/admin?tab=moderation" className="link-more">
                  Open queue
                </Link>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                {pending > 0
                  ? `${pending} review${pending > 1 ? 's' : ''} moderation ka wait kar rahi hain.`
                  : 'Moderation queue clear hai — sab reviews published hain.'}
              </p>
            </div>

            <div className="panel">
              <div className="panel-title">
                <span>Top reviews · by likes</span>
                <Link href="/admin?tab=moderation" className="link-more">
                  Moderate
                </Link>
              </div>
              {topReviews.map((r, i) => (
                <div key={r.id} className="member-row">
                  <span className="rank-num" style={{ width: 22 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="mr-name" style={{ display: 'block' }}>
                      {r.headline ?? r.title.title}
                      {r.user?.role === 'ADMIN' ? <span className="mini-badge">ADMIN</span> : null}
                      {r.editorial ? <span className="mini-badge">EDITORIAL</span> : null}
                      {r.featured ? <span className="mini-badge">PINNED</span> : null}
                    </span>
                    <span className="mr-meta">
                      {r.user?.name ?? r.authorName ?? 'CiNEMAsFLiX'} · {r.title.title}
                    </span>
                  </span>
                  <span className="mr-count" style={{ minWidth: 62, textAlign: 'right' }}>
                    ♥ {r._count.likes} · {r._count.comments}
                  </span>
                  <AdminButton
                    action="review.feature"
                    id={r.id}
                    value={r.featured ? 'false' : 'true'}
                    label={r.featured ? 'Unpin' : 'Pin'}
                  />
                </div>
              ))}
            </div>

            <div className="split" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="panel">
                <div className="panel-title">
                  <span>Newest members</span>
                </div>
                {recentUsers.map((u) => (
                  <div key={u.id} className="member-row">
                    <span className="avatar" style={{ background: avatarGradient(u.email), width: 30, height: 30, fontSize: 10 }}>
                      {initials(u.name ?? u.email)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="mr-name" style={{ display: 'block' }}>{u.name ?? 'Member'}</span>
                      <span className="mr-meta">{u.email}</span>
                    </span>
                    <span className="mr-count">{u._count.reviews} rv</span>
                  </div>
                ))}
              </div>

              <div className="panel">
                <div className="panel-title">
                  <span>Latest comments</span>
                </div>
                {recentComments.map((c) => (
                  <div key={c.id} className="member-row" style={{ alignItems: 'flex-start' }}>
                    <span style={{ minWidth: 0 }}>
                      <span className="mr-name" style={{ display: 'block' }}>{c.user.name ?? c.user.email ?? 'Member'}</span>
                      <span className="mr-meta" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>
                        {c.body.slice(0, 60)}
                      </span>
                    </span>
                    <span className="mr-count">{timeAgo(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tab === 'moderation' ? (
          <div className="panel">
            <div className="panel-title">
              <span>Review moderation</span>
              <span>{pendingReviews.length} items</span>
            </div>
            <div className="t-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Review</th>
                    <th>Author</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 260 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.title.poster} alt="" style={{ width: 30, height: 44, objectFit: 'cover', borderRadius: 5 }} />
                          <span>
                            <span className="t-title" style={{ display: 'block' }}>
                              {r.headline ?? r.title.title}
                              {r.featured ? <span className="mini-badge">PINNED</span> : null}
                            </span>
                            <span className="t-sub">{r.title.title} · {r._count.likes} likes · {r._count.comments} comments</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="t-title">{r.user?.name ?? r.authorName ?? 'Editorial'}</span>
                        <div className="t-sub">{r.user?.email ?? 'cinemood editorial · no account'}</div>
                      </td>
                      <td className="mono">{r.rating}/10</td>
                      <td>
                        <span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span>
                      </td>
                      <td>
                        <div className="t-actions">
                          {r.status !== 'PUBLISHED' ? (
                            <AdminButton action="review.status" id={r.id} value="PUBLISHED" label="Publish" />
                          ) : (
                            <AdminButton action="review.status" id={r.id} value="HIDDEN" label="Hide" />
                          )}
                          <AdminButton
                            action="review.feature"
                            id={r.id}
                            value={r.featured ? 'false' : 'true'}
                            label={r.featured ? 'Unpin' : 'Pin as verdict'}
                          />
                          <AdminButton action="review.delete" id={r.id} label="Delete" variant="danger" confirmText="Delete this review permanently?" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'titles' ? (
          <div className="panel">
            <div className="panel-title">
              <span>Catalogue · {allTitles.length}</span>
              <Link href="/admin?tab=import" className="link-more">
                + Import
              </Link>
            </div>
            <div className="t-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Year</th>
                    <th>Reviews</th>
                    <th>Likes</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTitles.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={t.poster} alt="" style={{ width: 28, height: 42, objectFit: 'cover', borderRadius: 5 }} />
                          <span>
                            <Link href={`/movies/${t.slug}`} className="t-title">
                              {t.title}
                            </Link>
                            <div className="t-sub">{t.slug}{t.featured ? ' · featured' : ''}</div>
                          </span>
                        </div>
                      </td>
                      <td className="mono">{t.year}</td>
                      <td className="mono">{t._count.reviews}</td>
                      <td className="mono">{t._count.likes}</td>
                      <td>
                        <span className={`status status-${t.status === 'PUBLISHED' ? 'published' : 'hidden'}`}>{t.status}</span>
                      </td>
                      <td>
                        <div className="t-actions">
                          <AdminButton
                            action="title.feature"
                            id={t.id}
                            value={t.featured ? 'false' : 'true'}
                            label={t.featured ? 'Unfeature' : 'Feature'}
                          />
                          <AdminButton
                            action="title.status"
                            id={t.id}
                            value={t.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'}
                            label={t.status === 'PUBLISHED' ? 'Hide' : 'Show'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'users' ? (
          <div className="panel">
            <div className="panel-title">
              <span>Members · {allUsers.length}</span>
            </div>
            <div className="t-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Reviews</th>
                    <th>Comments</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                          <span className="avatar" style={{ background: avatarGradient(u.email), width: 28, height: 28, fontSize: 10 }}>
                            {initials(u.name ?? u.email)}
                          </span>
                          <span>
                            <span className="t-title">{u.name ?? 'Member'}</span>
                            <div className="t-sub">{u.email}</div>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status ${u.role === 'ADMIN' ? 'status-published' : 'status-hidden'}`}>{u.role}</span>
                      </td>
                      <td className="mono">{u._count.reviews}</td>
                      <td className="mono">{u._count.comments}</td>
                      <td className="mono t-sub">{timeAgo(u.createdAt)}</td>
                      <td>
                        <div className="t-actions">
                          <AdminButton
                            action="user.role"
                            id={u.id}
                            value={u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                            label={u.role === 'ADMIN' ? 'Demote' : 'Make admin'}
                          />
                          <AdminButton
                            action="user.delete"
                            id={u.id}
                            label="Delete"
                            variant="danger"
                            confirmText={`Delete ${u.email}? Unke reviews aur comments bhi delete ho jayenge.`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'analytics' && analytics ? (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="sl">Page views</div>
                <div className="sv">{analytics.total}</div>
                <div className="sd">{analytics.last7} last 7 days</div>
              </div>
              <div className="stat-card">
                <div className="sl">Visitors · 7d</div>
                <div className="sv">{analytics.visitors7}</div>
                <div className="sd">unique, hashed ids</div>
              </div>
              <div className="stat-card">
                <div className="sl">Guests vs members</div>
                <div className="sv">{analytics.guests}<small style={{ fontSize: 13, opacity: 0.6 }}> / {analytics.members}</small></div>
                <div className="sd">read-only vs signed in</div>
              </div>
              <div className="stat-card">
                <div className="sl">Catalogue</div>
                <div className="sv">{titles}</div>
                <div className="sd">{reviews} reviews total</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                <span>Traffic · last 14 days</span>
                <span className="faint mono" style={{ fontSize: 10 }}>first-party · no cookies</span>
              </div>
              <div className="spark">
                {analytics.daily.map((d) => {
                  const max = Math.max(1, ...analytics.daily.map((x) => x.views));
                  return (
                    <div key={d.day} className="spark-col" title={`${d.day}: ${d.views} views · ${d.visitors} visitors`}>
                      <span className="spark-bar" style={{ height: `${Math.max(3, (d.views / max) * 100)}%` }} />
                      <span className="spark-label">{d.day.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="split" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="panel">
                <div className="panel-title"><span>Top pages · 30d</span></div>
                {analytics.topPaths.length === 0 ? (
                  <p className="faint" style={{ fontSize: 13 }}>Abhi tak koi page view record nahi hua.</p>
                ) : (
                  analytics.topPaths.map((p, i) => (
                    <div key={p.path} className="member-row">
                      <span className="rank-num" style={{ width: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="mr-name mono" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.path}</span>
                      <span className="mr-count">{p.views}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="panel">
                <div className="panel-title"><span>Top titles · 30d</span></div>
                {analytics.topTitles.length === 0 ? (
                  <p className="faint" style={{ fontSize: 13 }}>Koi title page abhi tak khola nahi gaya.</p>
                ) : (
                  analytics.topTitles.map((t, i) => (
                    <div key={t.slug} className="member-row">
                      <span className="rank-num" style={{ width: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                      <Link href={`/movies/${t.slug}`} className="mr-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</Link>
                      <span className="mr-count">{t.views}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="split" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="panel">
                <div className="panel-title"><span>Devices · 30d</span></div>
                {analytics.devices.map((d) => (
                  <div key={d.device} className="member-row">
                    <span className="mr-name" style={{ flex: 1 }}>{d.device}</span>
                    <span className="mr-count">{d.views}</span>
                  </div>
                ))}
              </div>
              <div className="panel">
                <div className="panel-title"><span>Referrers · 30d</span></div>
                {analytics.refs.map((r) => (
                  <div key={r.referrer} className="member-row">
                    <span className="mr-name" style={{ flex: 1 }}>{r.referrer}</span>
                    <span className="mr-count">{r.views}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tab === 'activity' ? (
          <div className="panel">
            <div className="panel-title">
              <span>Admin actions · last 50</span>
              <span className="faint mono" style={{ fontSize: 10 }}>audit trail</span>
            </div>
            {adminLog.length === 0 ? (
              <p className="faint" style={{ fontSize: 13 }}>Koi admin action record nahi hua — moderation karte hi yahan dikhega.</p>
            ) : (
              <div className="t-scroll">
                <table className="table">
                  <thead>
                    <tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Value</th></tr>
                  </thead>
                  <tbody>
                    {adminLog.map((l) => (
                      <tr key={l.id}>
                        <td className="mono t-sub">{timeAgo(l.createdAt)}</td>
                        <td>{l.actor}</td>
                        <td className="mono">{l.action}</td>
                        <td className="mono t-sub">{l.target.slice(0, 10)}…</td>
                        <td className="mono t-sub">{l.meta ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {tab === 'editorial' ? <EditorialEditor titles={titleOptions} rows={editorialRows} /> : null}

        {tab === 'import' ? <TmdbImport configured={tmdbConfigured()} /> : null}
      </div>
    </div>
  );
}
