import { getLang } from '@/lib/i18n-server';
import { t } from '@/lib/i18n';
import Link from 'next/link';
import PosterCard from '@/components/PosterCard';
import { getCatalogue, getFeatured, getGenres, type PosterTitle } from '@/lib/queries';
import { formatRuntime } from '@/lib/format';
import DataBanner from '@/components/DataBanner';
import TrailerModal from '@/components/TrailerModal';
import { settleAll } from '@/lib/safe';

export default async function HomePage() {
  const settled = await settleAll(
    [getFeatured(), getGenres(), getCatalogue({ take: 100, sort: 'trending' }), getCatalogue({ take: 100, sort: 'newest' }), getLang()],
    [null, [], [], [], 'en']
  );
  const [featured, genres, catalogue, newest, lang] = settled.data;
  const hero = featured ?? catalogue[0] ?? null;
  const trending: PosterTitle[] = catalogue.slice(0, 16);
  const fresh: PosterTitle[] = newest.slice(0, 12);

  return (
    <>
      <DataBanner message={settled.error} />
      {hero ? (
        <section className="hero hero-poster-first">
          <div className="hero-bg" style={{ backgroundImage: `url(${hero.backdrop || hero.poster})` }} />
          <div className="hero-inner">
            <div className="hero-content">
              <div className="eyebrow">Featured {hero.mediaType === 'tv' ? 'series' : 'film'}</div>
              <h1 className="hero-title">{hero.title}</h1>
              <div className="hero-meta">
                <span className="tag">{hero.year}</span>
                <span className="tag">{hero.mediaType === 'tv' ? 'TV series' : 'Film'}</span>
                {hero.runtime > 0 ? <span className="tag">{hero.mediaType === 'tv' ? `${hero.runtime} min / ep` : formatRuntime(hero.runtime)}</span> : null}
                {hero.genres.slice(0, 2).map((genre: string) => <span key={genre} className="tag">{genre}</span>)}
              </div>
              {hero.overview ? <p className="hero-syn">{hero.overview}</p> : null}
              <div className="hero-actions">
                <Link href={`/movies/${hero.slug}`} className="btn btn-primary">View title →</Link>
                <TrailerModal title={hero.title} trailerEn={hero.trailerEn} trailerHi={hero.trailerHi} poster={hero.poster} />
              </div>
            </div>
          </div>
          <div className="hero-side">
            <Link href={`/movies/${hero.slug}`} className="hero-poster" aria-label={`${hero.title} — view title`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.poster} alt={`${hero.title} poster`} />
            </Link>
          </div>
        </section>
      ) : null}

      <div className="container">
        <div className="section" style={{ paddingTop: 22, paddingBottom: 8 }}>
          <div className="chip-row">
            {genres.slice(0, 8).map((genre: string) => (
              <Link key={genre} href={`/movies?genre=${encodeURIComponent(genre)}`} className="chip">{genre}</Link>
            ))}
            <Link href="/movies" className="chip" data-on="true">Browse all</Link>
          </div>
        </div>
      </div>

      <section className="section home-poster-section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Films & series</div>
              <h2>{t(lang, 'trending')}</h2>
              <p className="sub">Poster-first discovery — movies and TV series, no review feed.</p>
            </div>
            <Link href="/movies?sort=trending" className="link-more">View catalogue →</Link>
          </div>
          <div className="rail">
            <div className="rail-track">
              {trending.map((title, index) => <PosterCard key={title.id} title={title} priority={index < 5} posterOnly />)}
            </div>
          </div>
        </div>
      </section>

      <section className="section home-poster-section" style={{ paddingTop: 4 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">Recently added</div>
              <h2>{t(lang, 'newArrivals')}</h2>
              <p className="sub">New films and TV series to discover.</p>
            </div>
            <Link href="/movies?sort=newest" className="link-more">See all →</Link>
          </div>
          <div className="grid-posters">
            {fresh.slice(0, 10).map((title) => <PosterCard key={title.id} title={title} posterOnly />)}
          </div>
        </div>
      </section>
    </>
  );
}
