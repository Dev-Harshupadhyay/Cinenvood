import { verdictFor } from '@/lib/verdict';

/**
 * The score, but at the END of the words.
 *
 * Readers should meet the review before the number — so this block sits below the
 * body copy on cards and on the review page. Same gold language as the composer,
 * one size down.
 */
export default function VerdictBlock({
  rating,
  size = 'card',
  edition = 'hi',
  className = ''
}: {
  rating: number;
  size?: 'card' | 'full';
  /** the one-liner follows the review edition: Hinglish at home, English abroad */
  edition?: 'en' | 'hi';
  className?: string;
}) {
  const band = verdictFor(rating);
  const line = edition === 'en' ? band.lineEn : band.line;

  return (
    <div className={`rv-verdict rv-verdict--${size} ${className}`.trim()} data-tone={band.tone}>
      <div className="rvv-dial" aria-hidden="true">
        <span className="rvv-num">{rating}</span>
        <span className="rvv-of">/10</span>
      </div>

      <div className="rvv-main">
        <div className="rvv-top">
          <span className="rvv-eyebrow">The verdict</span>
          <span className="rvv-word">{band.label}</span>
        </div>

        <div className="rvv-meter" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} data-on={i < Math.round(rating)} />
          ))}
        </div>

        {size === 'full' ? <p className="rvv-line">{line}</p> : null}
      </div>

      <span className="sr-only">{`Rated ${rating} out of 10 — ${band.label}`}</span>
    </div>
  );
}
