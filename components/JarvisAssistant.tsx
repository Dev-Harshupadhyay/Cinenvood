'use client';

import { useMemo, useState } from 'react';
import JarvisReviewWriter from '@/components/JarvisReviewWriter';

type TitleOption = { id: string; title: string; year: number; poster: string };
type AnswerSource = { id: string; label: string };
type AssistantResponse = { answer?: string; sources?: AnswerSource[]; error?: string };

function isAssistantResponse(value: unknown): value is AssistantResponse {
  return typeof value === 'object' && value !== null;
}

export default function JarvisAssistant({ titles, initialTitleId = '', initialMode = 'review', catalogueUnavailable = false, signedIn = false }: {
  titles: TitleOption[];
  initialTitleId?: string;
  initialMode?: 'ask' | 'review';
  catalogueUnavailable?: boolean;
  signedIn?: boolean;
}) {
  const [mode, setMode] = useState<'ask' | 'review'>(initialMode);
  const [titleId, setTitleId] = useState(initialTitleId);
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<AnswerSource[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const options = normalized ? titles.filter((item) => item.title.toLowerCase().includes(normalized)) : titles;
    return options.slice(0, 80);
  }, [query, titles]);
  const selectedTitle = titles.find((item) => item.id === titleId);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titleId || question.trim().length < 3) {
      setError('Pehle catalogue se title chuno aur apna sawaal likho.');
      return;
    }

    setBusy(true);
    setError('');
    setAnswer('');
    setSources([]);
    try {
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ titleId, question: question.trim() })
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = isAssistantResponse(payload) ? payload : {};
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Jarvis is temporarily unavailable.');
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Jarvis returned no answer. Please try again.');
      setAnswer(data.answer);
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jarvis is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="jarvis-shell">
      <div className="panel jarvis-intro">
        <div className="jarvis-mark" aria-hidden="true">✦</div>
        <div>
          <div className="eyebrow">CINE·MOOD INTELLIGENCE</div>
          <h1>{mode === 'review' ? 'Jarvis Review Studio' : 'Ask Jarvis'}</h1>
          <p className="sub">{mode === 'review' ? 'IMDbio metadata + your real thoughts + the way you write.' : 'Movie facts and opinion summaries, grounded in Cinevood catalogue data and available published reviews.'}</p>
        </div>
      </div>

      <div className="jarvis-mode-tabs" role="tablist" aria-label="Jarvis modes">
        <button type="button" role="tab" aria-selected={mode === 'review'} data-active={mode === 'review'} onClick={() => setMode('review')}>Review in my style</button>
        <button type="button" role="tab" aria-selected={mode === 'ask'} data-active={mode === 'ask'} onClick={() => setMode('ask')}>Ask about a movie</button>
      </div>

      {mode === 'review' ? <JarvisReviewWriter signedIn={signedIn} /> : catalogueUnavailable ? (
        <div className="empty"><b>Catalogue is temporarily unavailable</b>Ask mode needs a Cinevood title record. Review drafting can still use IMDbio above.</div>
      ) : <>
      <form className="panel jarvis-form" onSubmit={ask}>
        <label className="field">
          <span>Choose a Cinevood title</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter titles…" aria-label="Filter titles" />
          <select className="input" value={titleId} onChange={(event) => setTitleId(event.target.value)} required>
            <option value="">Select a movie or series…</option>
            {filtered.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.year})</option>)}
          </select>
        </label>
        <label className="field">
          <span>Your movie question</span>
          <textarea
            className="input"
            rows={4}
            maxLength={700}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What do viewers praise or criticize? Explain the rating split, summarize the synopsis, or compare the opinions in the available reviews…"
            required
          />
          <small className="faint">{question.length}/700</small>
        </label>
        <div className="jarvis-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !titleId || question.trim().length < 3}>
            {busy ? 'Jarvis is checking sources…' : 'Ask Jarvis →'}
          </button>
          {selectedTitle ? <span className="faint">Using sources for {selectedTitle.title} ({selectedTitle.year})</span> : null}
        </div>
        <p className="jarvis-disclaimer">Each question sends the selected title’s catalogue metadata and published, non-spoiler reviews to the configured Gemini API for one grounded answer. User profiles and private account data are not included; this is retrieval, not model fine-tuning. Jarvis should say when sources do not establish a fact.</p>
      </form>

      {error ? <div className="empty" role="alert"><b>Could not answer</b>{error}</div> : null}
      {answer ? (
        <article className="panel jarvis-answer" aria-live="polite">
          <div className="panel-title"><span>Jarvis’ answer</span><span className="tag">Source-grounded</span></div>
          <p className="jarvis-answer-copy">{answer}</p>
          {sources.length ? (
            <div className="jarvis-sources">
              <b>Sources used</b>
              <ul>{sources.map((source) => <li key={source.id}><code>[{source.id}]</code> {source.label}</li>)}</ul>
            </div>
          ) : null}
        </article>
      ) : null}
      </>}
    </section>
  );
}
