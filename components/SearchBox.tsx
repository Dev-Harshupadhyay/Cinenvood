'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { slug: string; title: string; year: number; poster: string; score: number | null };

export default function SearchBox({ placeholder = 'Search movies, people, moods…' }: { placeholder?: string } = {}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    router.push(`/movies?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="search" ref={box}>
      <form className="search-field" onSubmit={submit} role="search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          placeholder={placeholder}
          aria-label="Search the catalogue"
        />
        {loading && (
          <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        )}
      </form>

      {open && (
        <div className="search-pop">
          {items.length === 0 ? (
            <div className="search-empty">Kuch nahi mila — try another title.</div>
          ) : (
            items.map((it) => (
              <div
                key={it.slug}
                className="search-item"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setOpen(false);
                  router.push(`/movies/${it.slug}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setOpen(false);
                    router.push(`/movies/${it.slug}`);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.poster} alt="" />
                <div>
                  <div className="st">{it.title}</div>
                  <div className="sm">
                    {it.year}
                    {it.score ? ` · ★ ${it.score.toFixed(1)}` : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
