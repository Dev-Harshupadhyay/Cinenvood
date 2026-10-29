import { getLang } from '@/lib/i18n-server';
import { t } from '@/lib/i18n';
import Link from 'next/link';
import PosterCard from '@/components/PosterCard';
import ReviewCard from '@/components/ReviewCard';
import { getSessionUser } from '@/lib/session';
import {
  getCatalogue,
  getFeatured,
  getGenres,
  getLatestReviews,
  getPlatformStats,
  getTopMembers,
  withViewerLikes
} from '@/lib/queries';
import { avatarGradient, formatRuntime, initials } from '@/lib/format';

export default async function HomePage() {
  const [featured, genres, catalogue, latestRaw, stats, members, sessionUser, lang] = await Promise.all([
    getFeatured(),
    getGenres(),
    getCatalogue({ take: 30 }),
    getLatestReviews(5),
    getPlatformStats(),
    getTopMembers(4),
    getSessionUser(),
    getLang()
  ]);

  const latest = await withViewerLikes(latestRaw, sessionUser?.id);
  const trending = [...catalogue].sort((a, b) => b.reviewCount * 3 + b.likes - (a.reviewCount * 3 + a.likes)).slice(0, 10);
  const topRated = [...catalogue].sort((a, b) => (b.communityScore ?? 0) - (a.communityScore ?? 0)).slice(0, 5);
  const fresh = [...catalogue].sort((a, b) => b.year - a.year).slice(0, 10);
  const hero = featured ?? catalogue[0];
  const heroScore = hero ? ((hero as any).communityScore ?? (hero as any).tmdbScore ?? hero.imdbRating ?? 0) : 0;

  return (
    <>
      {hero ? (
        <section className="hero">
          <div className="hero-bg" style={{ backgroundImage: `url(${(hero as any).backdrop ?? hero.poster})` }} />
          <div className="hero-inner">
            <div className="hero-content">
              <div className="eyebrow">Featured title</div>
              <h1 className="hero-title">{hero.title}</h1>
              <div className="hero-meta">
                <span className="tag">{hero.year}</span>
                <span className="tag">{formatRuntime(hero.runtime)}</span>
                {hero.genres.slice(0, 2).map((g) => (
                  <span key={g} className="tag">
                    {g}
                  </span>
                ))}
                <span className="tag tag-gold">★ {heroScore.toFixed(1)} community</span>
                <span className="tag tag-accent">{hero.reviewCount} reviews</span>
              </div>
              <p className="hero-syn">{(hero as any).overview}</p>
              <div className="hero-actions">
                <Link href={`/movies/${hero.slug}`} className="btn btn-primary">
                  Read reviews
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                  </svg>
                </Link>
                <Link href={`/movies/${hero.slug}#review`} className="btn">
                  Write a review
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-side">
            <div className="score-ring" style={{ ['--val' as string]: heroScore * 10, ['--size' as string]: '86px' }}>
              <div>
                <b style={{ fontSize: 23 }}>{heroScore.toFixed(1)}</b>
                <span>community</span>
              </div>
            </div>
            <Link href={`/movies/${hero.slug}`} className="hero-poster" aria-label={`${hero.title} — open reviews`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.poster} alt={`${hero.title} poster`} />
            </Link>
          </div>
        </section>
      ) : null}

      <div className="container">
        <div className="section" style={{ paddingTop: 26 }}>
          <div className="chip-row">
            {genres.slice(0, 8).map((g) => (
              <Link key={g} href={`/movies?genre=${encodeURIComponent(g)}`} className="chip">
                {g}
              </Link>
            ))}
            <Link href="/movies" className="chip" data-on="true">
              All titles
            </Link>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">{t(lang, 'trending')}</div>
              <h2>{t(lang, 'trending')}</h2>
              <p className="sub">Likes, reviews aur comments ke hisaab se ranked.</p>
            </div>
            <Link href="/movies?sort=trending" className="link-more">
              {t(lang, 'viewAll')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="rail">
            <div className="rail-track">
              {trending.map((t, i) => (
                <PosterCard key={t.id} title={t} priority={i < 5} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <div className="split">
            <div>
              <div className="section-head">
                <div>
                  <div className="eyebrow">{t(lang, 'communityFeed')}</div>
                  <h2>{t(lang, 'latest')}</h2>
                  <p className="sub">Real members, real verdicts — #{stats.reviews} published.</p>
                </div>
                <Link href="/reviews" className="link-more">
                  All reviews
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                  </svg>
                </Link>
              </div>
              <div className="review-list">
                {latest.map((r) => (
                  <ReviewCard key={r.id} review={r as any} authed={Boolean(sessionUser)} />
                ))}
              </div>
            </div>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="panel">
                <div className="panel-title">
                  <span>{t(lang, 'topRated')}</span>
                  <span>community</span>
                </div>
                <div className="rank-list">
                  {topRated.map((t, i) => (
                    <Link key={t.id} href={`/movies/${t.slug}`} className="rank-row">
                      <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="rank-poster" src={t.poster} alt="" loading="lazy" />
                      <span className="rank-info">
                        <span className="rn">{t.title}</span>
                        <span className="rm">
                          {t.year} · {t.reviewCount} reviews
                        </span>
                      </span>
                      <span className="rank-score">{(t.communityScore ?? t.tmdbScore ?? t.imdbRating ?? 0).toFixed(1)}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">
                  <span>Platform pulse</span>
                  <span>live</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['Titles', stats.titles],
                    ['Reviews', stats.reviews],
                    ['Likes', stats.likes],
                    ['Members', stats.users]
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)' }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>
                        {value as number}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">
                  <span>Top reviewers</span>
                  <Link href="/community" className="link-more" style={{ letterSpacing: 0 }}>
                    all
                  </Link>
                </div>
                {members.length === 0 ? (
                  <div className="empty" style={{ padding: '18px 14px' }}>
                    <b>Pehla member bano</b>
                    Koi fake profile nahi — sirf real Google accounts. Sign in karke apna pehla verdict likho.
                    <div style={{ marginTop: 10 }}>
                      <Link href="/login" className="btn btn-sm btn-primary">Sign in with Google</Link>
                    </div>
                  </div>
                ) : null}
                {members.map((m) => (
                  <div key={m.id} className="member-row">
                    <span className="avatar" style={{ background: avatarGradient(m.email), width: 32, height: 32, fontSize: 11 }}>
                      {m.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" />
                      ) : (
                        initials(m.name ?? m.email)
                      )}
                    </span>
                    <span>
                      <span className="mr-name" style={{ display: 'block' }}>
                        {m.name ?? 'Member'}
                      </span>
                      <span className="mr-meta">{m.role === 'ADMIN' ? 'Curator' : 'Member'}</span>
                    </span>
                    <span className="mr-count">{m._count.reviews} ★</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Fresh in catalogue</div>
              <h2>{t(lang, 'newArrivals')}</h2>
              <p className="sub">Latest additions, ready for your verdict.</p>
            </div>
            <Link href="/movies?sort=newest" className="link-more">
              Browse
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="grid-posters">
            {fresh.slice(0, 5).map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
