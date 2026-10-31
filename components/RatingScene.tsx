import { RING, verdictFor } from '@/lib/verdict';
import { formatRuntime } from '@/lib/format';

type Bucket = { rating: number; count: number };

export default function RatingScene({
  score,
  communityVotes,
  reviewCount,
  imdbRating,
  myRating,
  buckets,
  genres,
  runtime,
  mediaType = 'movie'
}: {
  score: number;
  communityVotes: number;
  reviewCount: number;
  imdbRating?: number | null;
  myRating?: number | null;
  buckets: Bucket[];
  genres: string[];
  runtime: number;
  mediaType?: 'movie' | 'tv';
}) {
  const v = verdictFor(score);
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const shown = buckets.filter((b) => b.count > 0).slice(0, 5);
  const max = Math.max(1, ...shown.map((b) => b.count));
  const votes = reviewCount;

  return (
    <section className="rating-scene" data-tone={v.tone} aria-label="Rating and recommendation">
      {/* ── verdict dial ─────────────────────────────────────────── */}
      <div className="rs-dial">
        <div className="vd-wrap">
          <svg viewBox="0 0 120 120" className="vd-ring" aria-hidden="true">
            <defs>
              <linearGradient id="vdGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--vd-a)" />
                <stop offset="100%" stopColor="var(--vd-b)" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={RING.r} className="vd-track" />
            <circle
              cx="60"
              cy="60"
              r={RING.r}
              className="vd-prog"
              stroke="url(#vdGrad)"
              strokeDasharray={RING.c}
              strokeDashoffset={RING.c * (1 - pct)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="vd-value">
            <b>{score ? score.toFixed(1) : '—'}</b>
            <span>/ 10</span>
          </div>
        </div>
        <div className="vd-word">{v.label}</div>
        <div className="vd-sub">
          {votes} {votes === 1 ? 'verdict' : 'verdicts'} · {communityVotes} likes
        </div>
      </div>

      {/* ── meter + distribution + compare ────────────────────────── */}
      <div className="rs-body">
        <div className="rs-meter" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <i key={i} data-on={i < Math.round(score)} />
          ))}
        </div>
        <div className="rs-scale">
          <span>Skip</span>
          <span>Time-pass</span>
          <span>Go for it</span>
          <span>Masterpiece</span>
        </div>

        <div className="rs-cols">
          <div className="rs-dist">
            <div className="rs-label">Community votes</div>
            {shown.length === 0 ? (
              <div className="rs-thin">
                <span>0</span> verdicts abhi — pehla verdict likhne wala hi trend set karega.
              </div>
            ) : null}
            {shown.map((b) => (
              <div key={b.rating} className="dist-row">
                <span className="dr-label">{b.rating}</span>
                <span className="dist-bar">
                  <i style={{ width: `${(b.count / max) * 100}%` }} />
                </span>
                <span className="dr-count">{b.count}</span>
              </div>
            ))}
          </div>

          <div className="rs-compare">
            <div className="rs-label">Side by side</div>
            <div className="cmp-row">
              <MiniDial label="MOOD" value={score} tone="site" />
              <MiniDial label="IMDb" value={imdbRating ?? null} tone="gold" />
              <MiniDial label="YOU" value={myRating ?? null} tone="mine" />
            </div>
          </div>
        </div>

        {/* ── recommendation strip ─────────────────────────────────── */}
        <div className="rec-strip">
          <span className="rec-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden="true">
              {v.tone === 'skip' ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="m5 13 4 4L19 7" />}
            </svg>
            {v.tone === 'skip' ? 'Not recommended' : 'Recommended'}
          </span>
          <span className="rec-line">{v.line}</span>
          <span className="rec-chips">
            {genres.slice(0, 2).map((g) => (
              <em key={g}>{g}</em>
            ))}
            <em>{mediaType === 'tv' ? `${formatRuntime(runtime)} / ep` : formatRuntime(runtime)}</em>
          </span>
        </div>
      </div>
    </section>
  );
}

function MiniDial({ label, value, tone }: { label: string; value: number | null; tone: 'site' | 'gold' | 'mine' }) {
  const val = value ?? 0;
  return (
    <div className="cmp" data-tone={tone} data-empty={value == null}>
      <div className="cmp-dial" style={{ ['--p' as string]: `${(val / 10) * 100}%` }}>
        <b>{value == null ? '—' : val.toFixed(1)}</b>
      </div>
      <span>{label}</span>
    </div>
  );
}
