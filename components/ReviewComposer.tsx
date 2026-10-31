'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verdictFor } from '@/lib/verdict';

type Existing = { id: string; rating: number; headline: string | null; body: string; spoiler: boolean } | null;

export default function ReviewComposer({
  titleId,
  titleName,
  imdbId,
  authed,
  existing
}: {
  titleId: string;
  titleName: string;
  imdbId?: string | null;
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
  const [jarvisBusy, setJarvisBusy] = useState(false);
  const [jarvisConsent, setJarvisConsent] = useState(false);
  const [jarvisMessage, setJarvisMessage] = useState('');
  const router = useRouter();
  const verdict = verdictFor(rating);
  function changeRating(value: number) {
    setRating(value);
    setJarvisConsent(false);
    setJarvisMessage('');
  }

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

  async function askJarvis() {
    setError('');
    setJarvisMessage('');
    const notes = body.trim();
    if (notes.length < 40) {
      setJarvisMessage('Jarvis ke liye apne thoughts 40+ characters mein pehle likho.');
      return;
    }
    if (!jarvisConsent) {
      setJarvisMessage('Jarvis draft banane se pehle consent tick karo.');
      return;
    }

    setJarvisBusy(true);
    try {
      const response = await fetch('/api/jarvis/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          titleId,
          ...(imdbId ? { imdbId } : {}),
          notes,
          rating,
          language: 'match',
          spoiler,
          useOwnReviews: false,
          styleSample: notes,
          short: true,
          consent: true
        })
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = typeof payload === 'object' && payload !== null ? payload as { error?: unknown; draft?: unknown } : {};
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Jarvis short review nahi bana saka.');
      const draft = typeof data.draft === 'object' && data.draft !== null ? data.draft as { headline?: unknown; body?: unknown } : null;
      if (!draft || typeof draft.body !== 'string' || typeof draft.headline !== 'string') throw new Error('Jarvis ne incomplete draft diya.');
      setBody(draft.body);
      if (draft.headline.trim()) setHeadline(draft.headline.slice(0, 90));
      setJarvisConsent(false);
      setJarvisMessage('Short draft ready—publish se pehle edit/check kar lo.');
    } catch (cause) {
      setJarvisMessage(cause instanceof Error ? cause.message : 'Jarvis temporarily unavailable hai.');
    } finally {
      setJarvisBusy(false);
    }
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
          onChange={(e) => { setBody(e.target.value); setJarvisMessage(''); setJarvisConsent(false); }}
          placeholder="What worked, what didn't, and who should watch it…"
        />
      </div>

      <div className="review-jarvis-assist">
        <label className="checkbox">
          <input type="checkbox" checked={jarvisConsent} onChange={(e) => setJarvisConsent(e.target.checked)} />
          Jarvis ko mere notes aur title details bhejkar ek short editable draft banane ki permission deta/deti hoon. Draft apne aap publish nahi hoga.
        </label>
        <div className="review-jarvis-actions">
          <button type="button" className="btn btn-ghost" onClick={askJarvis} disabled={jarvisBusy || body.trim().length < 40 || !jarvisConsent}>
            {jarvisBusy ? 'Jarvis short draft bana raha hai…' : '✦ Jarvis se short review draft'}
          </button>
          {jarvisMessage ? <span className="faint" role="status">{jarvisMessage}</span> : <span className="faint">Pehle apne thoughts likho; Jarvis unhe 2–3 sentence mein shape karega.</span>}
        </div>
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
                    onClick={() => changeRating(value)}
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
          onChange={(e) => changeRating(Number(e.target.value))}
        />
        <div className="sb-scale" aria-hidden="true">
          <span>1 · SKIP</span>
          <span>5 · TIME-PASS</span>
          <span>10 · MASTERPIECE</span>
        </div>
      </div>

      <label className="checkbox" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={spoiler} onChange={(e) => { setSpoiler(e.target.checked); setJarvisConsent(false); setJarvisMessage(''); }} />
        Contains spoilers
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={busy || jarvisBusy}>
          {busy ? 'Saving…' : existing ? 'Update review' : 'Publish review'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
