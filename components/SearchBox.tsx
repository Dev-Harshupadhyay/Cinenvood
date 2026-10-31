'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PosterImage from '@/components/PosterImage';

type Item = {
  key: string;
  href: string;
  title: string;
  year: number;
  poster: string;
  score: number | null;
  mediaType: 'movie' | 'tv';
  source: 'catalogue' | 'imdb' | 'tmdb';
  imdbId?: string;
};

export default function SearchBox({ placeholder = 'Search movies, series…' }: { placeholder?: string } = {}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const ctrl = new AbortController();
    setItems([]);
    setLoading(true);
    setOpen(true);
    setActiveIndex(-1);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
          headers: { accept: 'application/json' },
          cache: 'no-store'
        });
        const data = res.ok ? await res.json() : { results: [] };
        if (!ctrl.signal.aborted) setItems(Array.isArray(data.results) ? data.results : []);
      } catch {
        // Network/API hiccups degrade to the same calm empty state; never throw into the header.
        if (!ctrl.signal.aborted) setItems([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 240);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    const active = activeIndex >= 0 ? items[activeIndex] : null;
    router.push(active?.href ?? `/search?q=${encodeURIComponent(term)}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const visibleCount = Math.min(items.length, 12);
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'ArrowDown' && visibleCount) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % visibleCount);
    } else if (e.key === 'ArrowUp' && visibleCount) {
      e.preventDefault();
      setActiveIndex((index) => (index <= 0 ? visibleCount - 1 : index - 1));
    }
  }

  const allHref = `/search?q=${encodeURIComponent(q.trim())}`;

  return (
    <div className="search" ref={box}>
      <form className="search-field" onSubmit={submit} role="search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </svg>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (q.trim().length >= 2) setOpen(true); }}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          aria-label="Search movies and series"
          aria-expanded={open}
          aria-controls="search-results"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          autoComplete="off"
        />
        {q ? (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQ(''); input.current?.focus(); }}>
            ×
          </button>
        ) : null}
        {loading ? (
          <svg className="spin search-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-label="Searching">
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        ) : null}
      </form>

      {open && q.trim().length >= 2 ? (
        <div className="search-pop" id="search-results" role="listbox" aria-label="Movie and series results">
          {loading ? (
            <div className="search-loading">
              <span className="search-loading-poster" />
              <span><i /><i /></span>
              <span className="search-loading-poster" />
              <span><i /><i /></span>
            </div>
          ) : items.length === 0 ? (
            <div className="search-empty"><b>No match yet</b><span>Try another title or spelling.</span></div>
          ) : (
            <>
              {items.slice(0, 12).map((item, index) => (
                <Link
                  key={item.key}
                  id={`search-result-${index}`}
                  href={item.href}
                  className="search-item"
                  role="option"
                  aria-selected={activeIndex === index}
                  data-active={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setOpen(false)}
                >
                  <PosterImage
                    src={item.poster}
                    title={item.title}
                    year={item.year}
                    mediaType={item.mediaType}
                    imdbId={item.imdbId}
                    fallbackSource={item.source === 'imdb' ? 'tmdb' : 'imdbio'}
                    alt=""
                    className="search-item-poster"
                    width={39}
                    height={56}
                    loading="lazy"
                  />
                  <span className="search-item-copy">
                    <span className="search-item-title">{item.title}</span>
                    <span className="search-item-meta">
                      {item.year || 'Year TBA'}{item.score ? ` · ★ ${item.score.toFixed(1)}` : ''}
                    </span>
                  </span>
                  <span className={`search-kind search-kind--${item.mediaType}`}>{item.mediaType === 'tv' ? 'SERIES' : 'FILM'}</span>
                </Link>
              ))}
              <Link href={allHref} className="search-all" onClick={() => setOpen(false)}>
                View all movie & series results <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
