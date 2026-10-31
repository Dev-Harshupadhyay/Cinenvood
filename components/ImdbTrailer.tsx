'use client';

import { useState } from 'react';

type Trailer = { videoId: string; title: string; channelTitle: string; thumbnail: string | null; watchUrl: string };
export default function ImdbTrailer({ title, year }: { title: string; year?: number | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [selected, setSelected] = useState('');

  async function findTrailers() {
    setOpen(true);
    if (trailers.length) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ title, year: year ? String(year) : '' });
      const response = await fetch(`/api/imdb/trailer?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.configured === false ? 'YouTube Data API key is not configured.' : 'Trailer search is temporarily unavailable.');
      setTrailers(data.results || []);
      if (!data.results?.length) setError('No embeddable trailer match found. Try searching on YouTube.');
      else setSelected(data.results[0].videoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trailer search failed.');
    } finally {
      setLoading(false);
    }
  }

  const current = trailers.find((item) => item.videoId === selected);
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={findTrailers}>
        <span aria-hidden="true">▶</span> Find trailer
      </button>
      {open ? <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
        <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`${title} YouTube trailers`} onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div><div className="eyebrow" style={{ margin: 0 }}>YouTube · Embeddable results</div><div style={{ fontWeight: 700 }}>{title}</div></div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="Close trailer search">✕</button>
          </div>
          {loading ? <div className="empty">Searching YouTube for trailer matches…</div> : null}
          {error ? <div className="empty"><b>Trailer not available</b>{error}<a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year || ''} official trailer`)}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Search YouTube ↗</a></div> : null}
          {current ? <div className="yt-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&rel=0`} title={current.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : null}
          {trailers.length ? <div style={{ padding: 14, display: 'grid', gap: 8 }}>
            {trailers.map((item) => <button type="button" key={item.videoId} className="btn btn-sm btn-ghost" data-on={selected === item.videoId} onClick={() => setSelected(item.videoId)} style={{ justifyContent: 'space-between', textAlign: 'left' }}>
              <span>{item.title}<span className="faint" style={{ display: 'block', fontSize: 11 }}>{item.channelTitle}</span></span>
              <span>{selected === item.videoId ? 'Playing' : 'Play'}</span>
            </button>)}
            {current ? <a href={current.watchUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open selected on YouTube ↗</a> : null}
            <p className="faint" style={{ fontSize: 11 }}>Search results are YouTube matches, not a guarantee of official studio ownership. Check the channel before relying on an upload.</p>
          </div> : null}
        </div>
      </div> : null}
    </>
  );
}
