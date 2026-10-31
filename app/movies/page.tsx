import Link from 'next/link';
import PosterCard from '@/components/PosterCard';
import { getCatalogue, getGenres } from '@/lib/queries';
import { settle } from '@/lib/safe';
import DataBanner from '@/components/DataBanner';

export const metadata = {
  title: 'Films & series',
  description: 'Browse CINE·MOOD films and TV series — posters, genres and community verdicts.',
  alternates: { canonical: '/movies' },
  openGraph: { title: 'Films & series · CINE·MOOD', description: 'Browse films and TV series with community verdicts.' }
};

const SORTS = [
  { key: 'trending', label: 'Trending' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
  { key: 'title', label: 'A–Z' }
];

export default async function MoviesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; genre?: string; sort?: string; type?: string }>;
}) {
  const { q = '', genre = 'All', sort = 'trending', type = 'all' } = await searchParams;
  const mediaType: 'movie' | 'tv' | 'all' = type === 'movie' || type === 'tv' ? type : 'all';
  const [genresRes, titlesRes] = await Promise.all([
    settle(getGenres(), [] as string[]),
    settle(getCatalogue({ q, genre, sort, take: 60, mediaType }), [])
  ]);
  const genres = genresRes.data;
  const titles = titlesRes.data;
  const dataError = genresRes.error ?? titlesRes.error;

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (genre !== 'All') p.set('genre', genre);
    if (sort !== 'trending') p.set('sort', sort);
    if (mediaType !== 'all') p.set('type', mediaType);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    const s = p.toString();
    return `/movies${s ? `?${s}` : ''}`;
  };

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 20 }}>
      <DataBanner message={dataError} />
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="eyebrow">Catalogue</div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>{q ? `Results for “${q}”` : 'Every title, one shelf'}</h1>
          <p className="sub">
            {titles.length} title{titles.length === 1 ? '' : 's'} · {mediaType === 'all' ? 'films & series' : mediaType === 'tv' ? 'TV series' : 'films'} · {genre === 'All' ? 'all genres' : genre} · sorted by {sort}
          </p>
        </div>
        {q ? (
          <Link href="/movies" className="btn btn-sm">
            Clear search
          </Link>
        ) : null}
      </div>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        {[
          { key: 'all', label: 'All titles' },
          { key: 'movie', label: 'Films' },
          { key: 'tv', label: 'TV series' }
        ].map((option) => (
          <Link key={option.key} href={qs({ type: option.key === 'all' ? '' : option.key })} className="chip" data-on={mediaType === option.key}>
            {option.label}
          </Link>
        ))}
      </div>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        <Link href={qs({ genre: 'All' })} className="chip" data-on={genre === 'All'}>
          All genres
        </Link>
        {genres.map((g) => (
          <Link key={g} href={qs({ genre: g })} className="chip" data-on={genre === g}>
            {g}
          </Link>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: 22 }}>
        {SORTS.map((s) => (
          <Link key={s.key} href={qs({ sort: s.key })} data-active={sort === s.key}>
            {s.label}
          </Link>
        ))}
      </div>

      {titles.length === 0 ? (
        <div className="empty">
          <b>{mediaType === 'tv' ? 'No TV series in the catalogue yet' : 'No titles found'}</b>
          {mediaType === 'tv' ? 'Try the header search for IMDb discovery, or import a series from the admin panel.' : 'Filter badlo ya search clear karo.'}
        </div>
      ) : (
        <div className="grid-posters">
          {titles.map((t, i) => (
            <PosterCard key={t.id} title={t} priority={i < 5} />
          ))}
        </div>
      )}
    </div>
  );
}
