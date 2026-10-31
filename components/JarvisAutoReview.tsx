'use client';

import { useEffect, useState } from 'react';

type ReviewData = {
  id: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isResponseData(value: unknown): value is ResponseData {
  return isRecord(value) && (typeof value.status === 'string' || typeof value.error === 'string');
}
function isReviewData(value: unknown): value is ReviewData {
  return isRecord(value) && typeof value.id === 'string' &&
    (value.headlineHi === null || typeof value.headlineHi === 'string') &&
    (value.bodyHi === null || typeof value.bodyHi === 'string') &&
    (value.headlineEn === null || typeof value.headlineEn === 'string') &&
    (value.bodyEn === null || typeof value.bodyEn === 'string');
}

export default function JarvisAutoReview({ imdbId, titleId, compact = false }: {
  imdbId?: string | null;
  titleId?: string;
  compact?: boolean;
}) {
  const [review, setReview] = useState<ReviewData | null>(null);
  const [imdbRating, setImdbRating] = useState<number | null>(null);
  const [sources, setSources] = useState('');
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');
  const [state, setState] = useState<'loading' | 'ready' | 'manual' | 'unavailable'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!imdbId && !titleId) {
      setState('unavailable');
      setMessage('IMDbio title data is not linked for this movie yet.');
      return;
    }
    const controller = new AbortController();
    void fetch('/api/jarvis/auto-review', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ...(imdbId ? { imdbId } : {}), ...(titleId ? { titleId } : {}) }),
      signal: controller.signal,
      cache: 'no-store'
    }).then(async (response) => {
      const payload: unknown = await response.json().catch(() => null);
      const data = isResponseData(payload) ? payload : {};
      if (data.status === 'manual') {
        setState('manual');
        return;
      }
      if (data.status === 'ready' && isReviewData(data.review)) {
        setReview(data.review);
        setImdbRating(typeof data.imdbRating === 'number' ? data.imdbRating : null);
        setSources(typeof data.sources === 'string' ? data.sources : 'IMDbio title metadata');
        setState('ready');
        return;
      }
      setMessage(typeof data.error === 'string' ? data.error : 'Jarvis review is temporarily unavailable.');
      setState('unavailable');
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setMessage(cause instanceof Error ? cause.message : 'Jarvis review is temporarily unavailable.');
        setState('unavailable');
      }
    });
    return () => controller.abort();
  }, [imdbId, titleId]);

  if (state === 'manual') return null;
  if (state === 'loading') {
    return <section className={`panel jarvis-auto-review${compact ? ' jarvis-auto-review--compact' : ''}`} aria-live="polite"><b>✦ Jarvis is checking this title…</b><p className="faint">A bilingual review is created once and cached for future searches.</p></section>;
  }
  if (state === 'unavailable' || !review) {
    return <section className={`panel jarvis-auto-review${compact ? ' jarvis-auto-review--compact' : ''}`}><div className="panel-title"><span>✦ Jarvis review</span><span className="tag">Not ready</span></div><p className="faint">{message}</p></section>;
  }

  const headline = language === 'hi' ? review.headlineHi : review.headlineEn;
  const body = language === 'hi' ? review.bodyHi : review.bodyEn;
  return (
    <article className={`panel jarvis-auto-review${compact ? ' jarvis-auto-review--compact' : ''}`} data-jarvis-auto-review="true">
      <div className="panel-title">
        <span>✦ Jarvis AI review</span>
        <span className="tag">Hinglish + English</span>
      </div>
      <div className="jarvis-auto-review-meta">
        {imdbRating !== null ? <span className="tag tag-gold">IMDbio ★ {imdbRating.toFixed(1)}/10</span> : null}
        <span className="faint">{sources}</span>
      </div>
      <div className="jarvis-review-tabs" role="tablist" aria-label="Jarvis review language">
        <button type="button" role="tab" aria-selected={language === 'hi'} data-active={language === 'hi'} onClick={() => setLanguage('hi')}>Hinglish</button>
        <button type="button" role="tab" aria-selected={language === 'en'} data-active={language === 'en'} onClick={() => setLanguage('en')}>English</button>
      </div>
      {headline ? <h3 className="jarvis-auto-review-headline">{headline}</h3> : null}
      <p className="jarvis-auto-review-copy">{body}</p>
      <p className="jarvis-auto-review-disclosure">AI-generated in Cinevood’s editorial voice from IMDbio metadata and available non-spoiler public reviews. It is not a personal viewing claim by the owner.</p>
    </article>
  );
}
