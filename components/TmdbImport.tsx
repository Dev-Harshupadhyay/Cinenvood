'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Result = { id: number; title: string; year: string; poster: string; vote: number; overview: string };

export default function TmdbImport({ configured }: { configured: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/tmdb?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      if (!data.results?.length) setMsg('No results. Check the API key or query.');
    } finally {
      setBusy(false);
    }
  }

  async function importTitle(id: number) {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/tmdb/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setMsg(`Imported “${data.title.title}” → /movies/${data.title.slug}`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <span>TMDB import</span>
        <span className="status" style={{ color: configured ? 'var(--accent)' : 'var(--faint)' }}>
          {configured ? 'API connected' : 'Demo mode'}
        </span>
      </div>

      {!configured && (
        <div className="notice" style={{ marginBottom: 14 }}>
          <b>TMDB_API_KEY missing.</b> Demo catalogue chal raha hai. Real fetch ke liye <code>.env</code> mein{' '}
          <code>TMDB_API_KEY=…</code> daalo (v3 key ya v4 bearer token) aur server restart karo. UI wahi rahega — data live ho jayega.
        </div>
      )}

      <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search TMDB — e.g. Interstellar"
          disabled={!configured}
        />
        <button type="submit" className="btn btn-primary" disabled={!configured || busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {msg ? <p className="form-note" style={{ marginBottom: 10 }}>{msg}</p> : null}

      <div style={{ display: 'grid', gap: 8 }}>
        {results.map((r) => (
          <div key={r.id} className="member-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.poster ? <img src={r.poster} alt="" style={{ width: 34, height: 50, objectFit: 'cover', borderRadius: 6 }} /> : null}
            <div style={{ minWidth: 0 }}>
              <div className="mr-name">
                {r.title} <span className="faint">({r.year})</span>
              </div>
              <div className="mr-meta">TMDB {r.vote.toFixed(1)} · {r.overview.slice(0, 60)}…</div>
            </div>
            <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => importTitle(r.id)} disabled={busy}>
              Import
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
