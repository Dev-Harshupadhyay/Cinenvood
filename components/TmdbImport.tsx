'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Result = { id: number; mediaType: 'movie' | 'tv'; title: string; year: string; poster: string; vote: number; overview: string };

export default function TmdbImport({ configured }: { configured: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2 || busy) return;
    setBusy(true);
    setMsg('');
    setResults([]);
    try {
      const res = await fetch(`/api/tmdb?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search is unavailable right now.');
      setResults(Array.isArray(data.results) ? data.results : []);
      if (!data.results?.length) setMsg('No results yet. Try another spelling or title.');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Search is unavailable right now. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function importTitle(id: number, mediaType: 'movie' | 'tv') {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/tmdb/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, mediaType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed. Try again.');
      setMsg(`Added “${data.title.title}” to the catalogue ✓`);
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Import failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <span>TMDB import · Films & series</span>
        <span className="status" style={{ color: configured ? 'var(--accent)' : 'var(--faint)' }}>
          {configured ? 'API connected' : 'Demo mode'}
        </span>
      </div>

      {!configured ? (
        <div className="notice" style={{ marginBottom: 14 }}>
          <b>TMDB_API_KEY is not set here.</b> Existing catalogue search still works; add your existing TMDB key to enable live movie and TV search.
        </div>
      ) : null}

      <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a movie or TV series"
          disabled={!configured || busy}
        />
        <button type="submit" className="btn btn-primary" disabled={!configured || busy || q.trim().length < 2}>
          {busy ? 'Searching…' : 'Search TMDB'}
        </button>
      </form>

      {msg ? <p className="form-note" role="status" style={{ marginBottom: 10 }}>{msg}</p> : null}

      <div style={{ display: 'grid', gap: 8 }}>
        {results.map((r) => (
          <div key={`${r.mediaType}-${r.id}`} className="member-row tmdb-import-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.poster ? <img src={r.poster} alt={`${r.title} poster`} style={{ width: 40, height: 58, objectFit: 'cover', borderRadius: 6 }} /> : <span className="tmdb-import-placeholder">▣</span>}
            <div style={{ minWidth: 0 }}>
              <div className="mr-name">
                {r.title} <span className="faint">({r.year || 'TBA'})</span>
              </div>
              <div className="mr-meta">{r.mediaType === 'tv' ? 'TV series' : 'Film'} · TMDB {r.vote.toFixed(1)} · {r.overview.slice(0, 72)}{r.overview.length > 72 ? '…' : ''}</div>
            </div>
            <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => importTitle(r.id, r.mediaType)} disabled={busy}>
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
