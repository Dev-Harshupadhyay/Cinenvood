'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verdictFor } from '@/lib/verdict';

type Existing = { id: string; rating: number; headline: string | null; body: string; spoiler: boolean } | null;

export default function ReviewComposer({
  titleId,
  titleName,
  authed,
  existing
}: {
  titleId: string;
  titleName: string;
  authed: boolean;
  existing: Existing;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 8);
  const [headline, setHeadline] = useState(existing?.headline ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [spoiler, setSpoiler] = useState(existing?.spoiler ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const verdict = verdictFor(rating);

  if (!authed) {
    return (
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Write a review</h3>
          <p className="faint" style={{ fontSize: 13 }}>
            Sign in to rate {titleName}, publish your verdict and like other reviews.
          </p>
        </div>
        <a href={`/login?next=/movies`} className="btn btn-primary">
          Sign in to review
        </a>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titleId, rating, headline, body, spoiler })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save review');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>{existing ? 'Your review' : 'Write a review'}</h3>
          <p className="faint" style={{ fontSize: 13 }}>
            {existing
              ? `You rated ${titleName} ${existing.rating}/10. Edit it any time.`
              : `Share your verdict on ${titleName} — rating, headline and a few lines.`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          {existing ? 'Edit review' : 'Write review'}
        </button>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-title">
        <span>{existing ? 'Edit your review' : 'New review'} · {titleName}</span>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="field">
        <label htmlFor="headline">Headline</label>
        <input
          id="headline"
          className="input"
          maxLength={90}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="One line verdict"
        />
      </div>

      <div className="field">
        <label htmlFor="body">Review</label>
        <textarea
          id="body"
          className="textarea"
          required
          minLength={20}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What worked, what didn't, and who should watch it…"
        />
      </div>

      {/* ── the verdict comes after the words, not before them ───────── */}
      <div className="score-block" data-tone={verdict.tone}>
        <div className="score-block-head">
          <span className="sb-eyebrow">Your verdict</span>
          <span className="sb-word">{verdict.label}</span>
        </div>

        <div className="sb-main">
          <div className="sb-dial" aria-hidden="true">
            <span className="sb-num">{rating}</span>
            <span className="sb-of">/10</span>
          </div>

          <div className="sb-right">
            <div className="sb-ticks" role="radiogroup" aria-label="Rating out of 10">
              {Array.from({ length: 10 }).map((_, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={value === rating}
                    aria-label={`${value} out of 10`}
                    className="sb-tick"
                    data-on={value <= rating}
                    onClick={() => setRating(value)}
                  >
                    <span />
                  </button>
                );
              })}
            </div>
            <p className="sb-line">{verdict.line}</p>
          </div>
        </div>

        <input
          className="sb-range"
          type="range"
          min={1}
          max={10}
          step={1}
          value={rating}
          aria-label="Rating out of 10"
          onChange={(e) => setRating(Number(e.target.value))}
        />
        <div className="sb-scale" aria-hidden="true">
          <span>1 · SKIP</span>
          <span>5 · TIME-PASS</span>
          <span>10 · MASTERPIECE</span>
        </div>
      </div>

      <label className="checkbox" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
        Contains spoilers
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Update review' : 'Publish review'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
