'use client';

import { useState } from 'react';

type ReviewData = {
  id: string;
  rating: number;
  headlineHi: string | null;
  bodyHi: string | null;
  headlineEn: string | null;
  bodyEn: string | null;
};
type ResponseData = {
  status?: string;
  review?: ReviewData;
  imdbRating?: number | null;
  sources?: string;
  error?: string;
};

type State = 'idle' | 'loading' | 'ready' | 'unavailable';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isResponseData(value: unknown): value is ResponseData {
  return isRecord(value) && (typeof value.status === 'string' || typeof value.error === 'string');
}
function isReviewData(value: unknown): value is ReviewData {
  return isRecord(value) && typeof value.id === 'string' && typeof value.rating === 'number' &&
    (value.headlineHi === null || typeof value.headlineHi === 'string') &&
    (value.bodyHi === null || typeof value.bodyHi === 'string') &&
    (value.headlineEn === null || typeof value.headlineEn === 'string') &&
    (value.bodyEn === null || typeof value.bodyEn === 'string');
}

function conciseDisplay(body: string | null) {
  const fullText = (body ?? '').replace(/\s+/g, ' ').trim();
  const sentences = fullText.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) ?? [fullText];
  const kept: string[] = [];
  let wordCount = 0;
  for (const sentence of sentences) {
    if (kept.length >= 3) break;
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    const remaining = 75 - wordCount;
    if (words.length > remaining) {
      if (remaining > 0 && kept.length === 0) kept.push(`${words.slice(0, remaining).join(' ')}…`);
      break;
    }
    kept.push(sentence.trim());
    wordCount += words.length;
  }
  const text = kept.join(' ').trim();
  return { text, shortened: text !== fullText };
}

export default function JarvisAutoReview({ imdbId, titleId, title, compact = false, initialReview = null, initialImdbRating = null }: {
  imdbId?: string | null;
  titleId?: string;
  title?: string;
  compact?: boolean;
  initialReview?: ReviewData | null;
  initialImdbRating?: number | null;
}) {
  const [review, setReview] = useState<ReviewData | null>(initialReview);
  const [imdbRating, setImdbRating] = useState<number | null>(initialImdbRating);
  const [sources, setSources] = useState(initialReview ? 'Saved Jarvis review · shared with everyone' : '');
  const [state, setState] = useState<State>(initialReview ? 'ready' : 'idle');
  const [message, setMessage] = useState('');

  async function requestReview() {
    if (!imdbId && !titleId) {
      setMessage('IMDbio title data is not linked for this movie yet.');
      setState('unavailable');
      return;
    }

    setState('loading');
    setMessage('');
    try {
      const response = await fetch('/api/jarvis/auto-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ ...(imdbId ? { imdbId } : {}), ...(titleId ? { titleId } : {}) }),
        cache: 'no-store'
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = isResponseData(payload) ? payload : {};
      if (data.status === 'ready' && isReviewData(data.review)) {
        setReview(data.review);
        setImdbRating(typeof data.imdbRating === 'number' ? data.imdbRating : null);
        setSources(typeof data.sources === 'string' ? data.sources : 'IMDbio title metadata');
        setState('ready');
        return;
      }
      setMessage(typeof data.error === 'string' ? data.error : 'Jarvis review is temporarily unavailable.');
      setState('unavailable');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Jarvis review is temporarily unavailable.');
      setState('unavailable');
    }
  }

  if (state === 'ready' && review) {
    const headline = review.headlineEn;
    const body = conciseDisplay(review.bodyEn);
    return (
      <article className={`panel jarvis-auto-review${compact ? ' jarvis-auto-review--compact' : ''}`} data-jarvis-auto-review="true">
        <div className="panel-title">
          <span>✦ Jarvis Auto Review · English{title ? ` · ${title}` : ''}</span>
          <span className="tag">Saved</span>
        </div>
        <div className="jarvis-auto-review-meta">
          <span className="tag tag-gold">Jarvis verdict · {review.rating}/10</span>
          {imdbRating !== null ? <span className="tag">IMDbio ★ {imdbRating.toFixed(1)}/10</span> : null}
          <span className="faint">{sources}</span>
        </div>
        {headline ? <h3 className="jarvis-auto-review-headline">{headline}</h3> : null}
        <p className="jarvis-auto-review-copy">{body.text}</p>
        {body.shortened ? <p className="faint">Showing a concise excerpt from the saved review.</p> : null}
        <p className="jarvis-auto-review-disclosure">AI-generated in the owner’s editorial style from published review examples and IMDbio information. It is not a personal viewing claim by the owner.</p>
      </article>
    );
  }

  return (
    <section className={`panel jarvis-auto-review${compact ? ' jarvis-auto-review--compact' : ''}`} aria-live="polite">
      <div className="panel-title"><span>✦ Generate Short English Jarvis Review</span><span className="tag">On demand</span></div>
      {state === 'loading' ? <p className="faint">Jarvis is preparing a short English review…</p> : null}
      {message ? <p className="faint" role="status">{message}</p> : null}
      {state === 'idle' ? <p className="faint">Jarvis uses the owner’s published reviews as style examples to create and save one short English review for this title.</p> : null}
      <button type="button" className={`btn btn-primary jarvis-review-trigger${compact ? ' btn-sm' : ''}`} onClick={requestReview} disabled={state === 'loading'}>
        {state === 'loading' ? 'Generating short English review…' : state === 'unavailable' ? 'Try again' : '✦ Generate Short English Review'}
      </button>
    </section>
  );
}
