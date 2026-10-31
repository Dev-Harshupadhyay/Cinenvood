'use client';

import { useState } from 'react';
import YouTubePlayer from '@/components/YouTubePlayer';

type Trailer = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
  watchUrl: string;
  likelyOfficial: boolean;
  language: 'en' | 'hi' | 'other';
};

type TrailerResponse = {
  results?: Trailer[];
  configured?: boolean;
  source?: 'tmdb' | 'youtube' | 'mixed';
  code?: string;
};

function isTrailerResponse(value: unknown): value is TrailerResponse {
  return typeof value === 'object' && value !== null;
}

function errorMessage(code?: string, configured?: boolean) {
  if (code === 'no_trailer_source') return 'No TMDB trailer was found, and YouTube search is not configured yet.';
  if (configured === false || code === 'missing_api_key') return 'YouTube trailer search is not configured yet.';
  if (code === 'quota_exceeded') return 'YouTube search quota is temporarily exhausted.';
  if (code === 'rate_limited') return 'Too many trailer searches. Please wait and try again.';
  if (code === 'api_unavailable') return 'The YouTube API key is invalid or the Data API is not enabled.';
  return 'Trailer search is temporarily unavailable.';
}

export default function ImdbTrailer({ title, year, tmdbId, mediaType = 'movie', buttonLabel = 'Trailer' }: {
  title: string;
  year?: number | null;
  tmdbId?: number | null;
  mediaType?: 'movie' | 'tv';
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [selected, setSelected] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [source, setSource] = useState<'tmdb' | 'youtube' | 'mixed' | ''>('');

  async function findTrailers() {
    setOpen(true);
    if (trailers.length) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ title, year: year ? String(year) : '', mediaType });
      if (tmdbId) params.set('tmdbId', String(tmdbId));
      const response = await fetch(`/api/imdb/trailer?${params}`, { headers: { accept: 'application/json' } });
      const payload: unknown = await response.json();
      const data = isTrailerResponse(payload) ? payload : {};
      if (!response.ok) throw new Error(errorMessage(data.code, data.configured));
      const matches = Array.isArray(data.results) ? data.results : [];
      setTrailers(matches);
      setSource(data.source === 'tmdb' || data.source === 'mixed' ? data.source : 'youtube');
      const initialLanguage = matches.some((item) => item.language === 'en') ? 'en' : 'hi';
      setLanguage(initialLanguage);
      const first = matches.find((item) => item.language === initialLanguage);
      if (matches.length === 0) setError('No trailer match found.');
      else if (first) setSelected(first.videoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trailer search failed.');
    } finally {
      setLoading(false);
    }
  }

  const current = trailers.find((item) => item.videoId === selected);
  const languageTrailers = trailers.filter((item) => item.language === language);
  function switchLanguage(next: 'en' | 'hi') {
    setLanguage(next);
    const first = trailers.find((item) => item.language === next);
    if (first) setSelected(first.videoId);
  }
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year || ''} official trailer`)}`;

  return (
    <>
      <button type="button" className="btn btn-primary trailer-search-button" onClick={findTrailers}>
        <span aria-hidden="true">▶</span> {buttonLabel}
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`${title} YouTube trailers`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div><div className="eyebrow" style={{ margin: 0 }}>Trailer matches · {source === 'mixed' ? 'TMDB + YouTube' : source === 'tmdb' ? 'TMDB videos' : 'YouTube search'}</div><div style={{ fontWeight: 700 }}>{title}</div></div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="Close trailer search">✕</button>
            </div>
            {loading ? <div className="empty">Checking TMDB and searching YouTube for trailer matches…</div> : null}
            {error ? (
              <div className="empty">
                <b>Trailer not available</b>
                {error}
                <a href={youtubeSearch} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Search YouTube ↗</a>
              </div>
            ) : null}
            {current ? (
              <div className="yt-frame">
                <YouTubePlayer videoId={current.videoId} title={current.title} fallbackUrl={current.watchUrl || youtubeSearch} />
              </div>
            ) : null}
            {trailers.length ? (
              <>
                <div className="trailer-language-switch" role="group" aria-label="Trailer language">
                  <button type="button" className="chip" data-on={language === 'en'} aria-pressed={language === 'en'} disabled={!trailers.some((item) => item.language === 'en')} onClick={() => switchLanguage('en')}>English</button>
                  <button type="button" className="chip" data-on={language === 'hi'} aria-pressed={language === 'hi'} disabled={!trailers.some((item) => item.language === 'hi')} onClick={() => switchLanguage('hi')}>Hindi</button>
                </div>
                <div className="trailer-options-list" style={{ padding: 14, display: 'grid', gap: 8 }}>
                  {languageTrailers.map((item) => (
                    <button
                      type="button"
                      key={item.videoId}
                      className="btn btn-sm btn-ghost"
                      data-on={selected === item.videoId}
                      onClick={() => setSelected(item.videoId)}
                      style={{ justifyContent: 'space-between', textAlign: 'left', gap: 10 }}
                    >
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail} alt="" width={82} height={46} loading="lazy" style={{ objectFit: 'cover', borderRadius: 5 }} />
                      ) : null}
                      <span style={{ flex: 1 }}>
                        {item.title}
                        <span className="faint" style={{ display: 'block', fontSize: 11 }}>
                          {item.channelTitle}{item.likelyOfficial ? ' · likely official' : ''}
                        </span>
                      </span>
                      <span>{selected === item.videoId ? 'Playing' : 'Play'}</span>
                    </button>
                  ))}
                  {current ? <a href={current.watchUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open selected on YouTube ↗</a> : null}
                  <p className="faint" style={{ fontSize: 11 }}>“Likely official” is a title/channel-text hint, not verification. Check the uploader before relying on a result.</p>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
