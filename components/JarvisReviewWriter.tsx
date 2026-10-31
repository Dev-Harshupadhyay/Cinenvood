'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SearchTitle = {
  imdbId: string;
  title: string;
  titleLocalized: string | null;
  coverUrl: string | null;
  year: number | null;
  kind: string | null;
  rating: number | null;
};
type TitleDetails = {
  imdbId: string;
  title: string;
  year: number | null;
  kind: string | null;
  coverUrl: string | null;
  plot: string | null;
  duration: number | null;
  rating: number | null;
  genres: string[];
  directors: string[];
  cast: { name: string; characters: string[] }[];
};
type ReviewDraft = { headline: string; body: string; rating: number; language: 'match' | 'hinglish' | 'english' };
type ApiResponse = {
  results?: SearchTitle[];
  detail?: TitleDetails;
  draft?: ReviewDraft;
  styleSources?: number;
  manualStyleSampleUsed?: boolean;
  note?: string;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function isSearchTitle(value: unknown): value is SearchTitle {
  return isRecord(value) && typeof value.imdbId === 'string' && /^tt\d+$/.test(value.imdbId) &&
    typeof value.title === 'string' && isNullableString(value.titleLocalized) && isNullableString(value.coverUrl) &&
    isNullableNumber(value.year) && isNullableString(value.kind) && isNullableNumber(value.rating);
}
function isTitleDetails(value: unknown): value is TitleDetails {
  if (!isRecord(value) || typeof value.imdbId !== 'string' || typeof value.title !== 'string') return false;
  const validCast = Array.isArray(value.cast) && value.cast.every((person) =>
    isRecord(person) && typeof person.name === 'string' && isStringArray(person.characters)
  );
  return isNullableNumber(value.year) && isNullableString(value.kind) && isNullableString(value.coverUrl) &&
    isNullableString(value.plot) && isNullableNumber(value.duration) && isNullableNumber(value.rating) &&
    isStringArray(value.genres) && isStringArray(value.directors) && validCast;
}
function isReviewDraft(value: unknown): value is ReviewDraft {
  return isRecord(value) && typeof value.body === 'string' && typeof value.headline === 'string' &&
    typeof value.rating === 'number' && Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 10 &&
    (value.language === 'match' || value.language === 'hinglish' || value.language === 'english');
}
function isApiResponse(value: unknown): value is ApiResponse { return isRecord(value); }

export default function JarvisReviewWriter({ signedIn }: { signedIn: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchTitle[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected] = useState<SearchTitle | null>(null);
  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [styleSample, setStyleSample] = useState('');
  const [useOwnReviews, setUseOwnReviews] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [language, setLanguage] = useState<'match' | 'hinglish' | 'english'>('match');
  const [spoiler, setSpoiler] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [styleSources, setStyleSources] = useState(0);
  const [manualStyleSampleUsed, setManualStyleSampleUsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/imdb/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
          cache: 'no-store'
        });
        const payload: unknown = await response.json().catch(() => null);
        const data = isApiResponse(payload) ? payload : {};
        if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'IMDbio search is temporarily unavailable.');
        setResults(Array.isArray(data.results) ? data.results.filter(isSearchTitle).slice(0, 16) : []);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError(cause instanceof Error ? cause.message : 'IMDbio search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    if (!selected) { setDetails(null); return; }
    const controller = new AbortController();
    setDetailsLoading(true);
    setDetails(null);
    void fetch(`/api/imdb/title/${encodeURIComponent(selected.imdbId)}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store'
    }).then(async (response) => {
      const payload: unknown = await response.json().catch(() => null);
      const data = isApiResponse(payload) ? payload : {};
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'IMDbio details are temporarily unavailable.');
      if (isTitleDetails(data)) setDetails(data);
      else throw new Error('IMDbio returned incomplete title details.');
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setSearchError(cause instanceof Error ? cause.message : 'Could not load IMDbio details.');
    }).finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [selected]);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCopied(false);
    setDraft(null);
    if (!selected) { setError('IMDbio se pehle movie choose karo.'); return; }
    if (rating === null) { setError('Apni genuine rating select karo.'); return; }
    if (notes.trim().length < 30) { setError('Apne real thoughts thode detail mein likho (minimum 30 characters).'); return; }
    if (!useOwnReviews && styleSample.trim().length < 40) { setError('Paste at least 40 characters from a review you wrote, or select your published review samples.'); return; }
    if (!consent) { setError('Gemini data-use notice accept karke hi draft generate hoga.'); return; }

    setBusy(true);
    try {
      const response = await fetch('/api/jarvis/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          imdbId: selected.imdbId,
          notes: notes.trim(),
          rating,
          language,
          spoiler,
          useOwnReviews,
          styleSample: useOwnReviews ? '' : styleSample.trim(),
          consent,
          short: true
        })
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = isApiResponse(payload) ? payload : {};
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Jarvis could not draft the review.');
      if (!isReviewDraft(data.draft)) throw new Error('Jarvis returned an incomplete draft.');
      setDraft(data.draft);
      setStyleSources(typeof data.styleSources === 'number' ? data.styleSources : 0);
      setManualStyleSampleUsed(data.manualStyleSampleUsed === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jarvis review drafting failed.');
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`${draft.headline ? `${draft.headline}\n\n` : ''}${draft.body}`);
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Clipboard access is unavailable. Select and copy the draft manually.');
    }
  }

  return (
    <div className="jarvis-writer">
      <form className="panel jarvis-form" onSubmit={generate}>
        <div className="panel-title"><span>Write a short review with Jarvis</span><span className="tag">IMDbio search</span></div>
        <p className="faint" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
          IMDbio supplies the title, poster, plot and cast. Your own notes supply the opinion; your own past reviews supply the voice.
        </p>

        <label className="field">
          <span>Search a movie or series</span>
          <input className="input" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setDraft(null); }} placeholder="Search IMDbio titles…" autoComplete="off" />
        </label>
        {searching ? <div className="faint">Searching IMDbio…</div> : null}
        {searchError ? <div className="form-note" role="status">{searchError}</div> : null}
        {query.trim().length >= 2 && !searching && !selected && results.length ? (
          <div className="jarvis-title-results" role="listbox" aria-label="IMDbio movie results">
            {results.map((item) => (
              <button className="jarvis-title-result" type="button" role="option" aria-selected={false} key={item.imdbId} onClick={() => { setSelected(item); setResults([]); setSearchError(''); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl || '/posters/placeholder.svg'} alt="" loading="lazy" />
                <span><b>{item.titleLocalized || item.title}</b><small>{item.year ?? 'Year unknown'} · {item.kind ?? 'IMDb title'} · IMDbio</small></span>
                {item.rating !== null ? <em>★ {item.rating.toFixed(1)}</em> : null}
              </button>
            ))}
          </div>
        ) : null}
        {query.trim().length >= 2 && !searching && !selected && !results.length && !searchError ? <div className="empty"><b>No IMDbio matches</b>Check the spelling or try the original title.</div> : null}

        {selected ? (
          <div className="panel jarvis-imdb-card">
            <div className="jarvis-imdb-overview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="jarvis-imdb-poster" src={details?.coverUrl || selected.coverUrl || '/posters/placeholder.svg'} alt={`${selected.title} poster`} />
              <div>
                <b>{details?.title || selected.title} {details?.year ? `(${details.year})` : selected.year ? `(${selected.year})` : ''}</b>
                <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>{details?.genres?.join(' · ') || selected.kind || 'IMDbio title'}</div>
                {details?.directors.length ? <div className="faint" style={{ fontSize: 11, marginTop: 5 }}>Director: {details.directors.join(', ')}</div> : null}
                {detailsLoading ? <div className="faint" style={{ fontSize: 11, marginTop: 5 }}>Loading IMDbio cast…</div> : null}
                {details?.cast.length ? <div className="faint" style={{ fontSize: 11, marginTop: 5 }}>Cast: {details.cast.slice(0, 6).map((person) => person.name).join(', ')}</div> : null}
                {details?.plot ? <p className="faint jarvis-imdb-plot">{details.plot}</p> : null}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link href={`/imdb/${selected.imdbId}`} className="link-more" target="_blank">IMDbio title details ↗</Link>
                  <button type="button" className="link-more" onClick={() => { setSelected(null); setQuery(''); setResults([]); setDetails(null); }}>Change title</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <label className="field">
          <span>Your actual thoughts on this movie</span>
          <textarea className="input" rows={4} maxLength={2400} minLength={30} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What did you genuinely like or dislike? Your reaction, pacing, performances, recommendation—only what you actually think. At least 30 characters." required />
          <small className="faint">{notes.length}/2400 · Jarvis will not invent your opinion.</small>
        </label>

        <div className="jarvis-review-options">
          <label className="field"><span>Your rating</span><select className="input" value={rating ?? ''} onChange={(event) => setRating(event.target.value ? Number(event.target.value) : null)} required><option value="">Choose your rating…</option>{Array.from({ length: 10 }, (_, index) => 10 - index).map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label>
          <label className="field"><span>Review language</span><select className="input" value={language} onChange={(event) => setLanguage(event.target.value as 'match' | 'hinglish' | 'english')}><option value="match">Match my style samples</option><option value="hinglish">Hinglish</option><option value="english">English</option></select></label>
        </div>

        <label className="check"><input type="checkbox" checked={useOwnReviews} onChange={(event) => { setUseOwnReviews(event.target.checked); setConsent(false); setDraft(null); }} /> Use up to five of my own published, non-spoiler Cinevood reviews as style examples.</label>
        {!useOwnReviews ? (
          <label className="field">
            <span>Paste a review you wrote (at least 40 characters)</span>
            <textarea className="input" rows={3} maxLength={1800} value={styleSample} onChange={(event) => setStyleSample(event.target.value)} placeholder="Only this sample will be used for voice. It is not stored." />
          </label>
        ) : <p className="faint" style={{ margin: 0, fontSize: 11 }}>If you have no published non-spoiler reviews, switch this off and paste your own writing instead.</p>}

        <label className="check"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /> I want to include spoiler details (Jarvis will only use details I wrote in my notes).</label>
        <label className="check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to send my notes and IMDbio metadata to Gemini, plus only the selected style source above. No other users’ reviews are used.</label>

        {!signedIn ? <div className="empty"><b>Sign in to use your own review style</b><Link href="/login?next=%2Fjarvis" className="btn btn-sm btn-primary">Sign in</Link></div> : null}
        <div className="jarvis-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !selected || rating === null || !consent || !signedIn}>{busy ? 'Jarvis is writing a short review…' : 'Draft a short review →'}</button>
          {selected ? <span className="faint">IMDbio metadata · {rating === null ? 'choose your rating' : `your rating ${rating}/10`}</span> : null}
        </div>
        {error ? <div className="empty" role="alert"><b>Could not draft</b>{error}</div> : null}
      </form>

      {draft ? (
        <article className="panel jarvis-answer" aria-live="polite">
          <div className="panel-title"><span>Your short review draft</span><span className="tag">Not published</span></div>
          {draft.headline ? <h2 className="jarvis-draft-headline">{draft.headline}</h2> : null}
          <div className="tag tag-gold" style={{ display: 'inline-flex', marginBottom: 10 }}>Your rating · {draft.rating}/10</div>
          <p className="jarvis-answer-copy">{draft.body}</p>
          <p className="jarvis-disclaimer">Voice reference: {styleSources > 0 ? `${styleSources} of your own published review${styleSources === 1 ? '' : 's'}` : manualStyleSampleUsed ? 'your pasted writing sample' : 'none'}; personal opinions came only from your notes. Edit it before posting—nothing was saved or published.</p>
          <button type="button" className="btn btn-ghost" onClick={copyDraft}>{copied ? 'Copied ✓' : 'Copy draft'}</button>
        </article>
      ) : null}
    </div>
  );
}
