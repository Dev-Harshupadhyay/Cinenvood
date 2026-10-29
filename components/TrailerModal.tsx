'use client';
import { useEffect, useState } from 'react';

type Props = { title: string; trailerEn?: string | null; trailerHi?: string | null; poster?: string };

const youtubeWatch = (key?: string | null) => key ? `https://www.youtube.com/watch?v=${encodeURIComponent(key)}` : null;

export default function TrailerModal({ title, trailerEn, trailerHi }: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [origin, setOrigin] = useState('');
  const hasEn = Boolean(trailerEn);
  const hasHi = Boolean(trailerHi);
  const hasAny = hasEn || hasHi;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!hasEn && hasHi) setLang('hi');
    if (hasEn && !hasHi) setLang('en');
  }, [hasEn, hasHi]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const key = lang === 'hi' ? trailerHi || trailerEn : trailerEn || trailerHi;
  const watchLink = youtubeWatch(trailerEn || trailerHi);
  const embedUrl = key
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
    : null;

  if (!hasAny || !watchLink) return null;

  return (
    <>
      <div className="trailer-link-group">
        <a href={watchLink} target="_blank" rel="noreferrer" className="btn btn-primary trailer-watch-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          Watch trailer on YouTube ↗
        </a>
        {hasEn && hasHi ? (
          <>
            <a href={youtubeWatch(trailerEn)!} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">EN ↗</a>
            <a href={youtubeWatch(trailerHi)!} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">हिंदी ↗</a>
          </>
        ) : null}
        <button type="button" className="btn btn-sm btn-ghost trailer-iframe-button" onClick={() => setOpen(true)}>
          Play here · iframe
        </button>
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${title} trailer`}>
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ margin: 0 }}>Official YouTube iframe</div>
                <div style={{ fontWeight: 700 }}>{title}</div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)} aria-label="Close trailer">✕</button>
            </div>
            {hasEn && hasHi ? (
              <div className="chip-row" style={{ padding: '10px 16px 0' }}>
                <button type="button" className="chip" data-on={lang === 'en'} onClick={() => setLang('en')}>English</button>
                <button type="button" className="chip" data-on={lang === 'hi'} onClick={() => setLang('hi')}>Hindi</button>
              </div>
            ) : null}
            <div className="yt-frame">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`${title} trailer (${lang})`}
                  allow="autoplay; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : null}
            </div>
            <div className="trailer-modal-actions">
              <a href={youtubeWatch(key)!} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open on YouTube ↗</a>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
