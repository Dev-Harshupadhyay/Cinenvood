'use client';
import { useState, useEffect } from 'react';

type Props = {
  title: string;
  trailerEn?: string | null;
  trailerHi?: string | null;
  poster?: string;
};

export default function TrailerModal({ title, trailerEn, trailerHi, poster }: Props) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const hasEn = Boolean(trailerEn);
  const hasHi = Boolean(trailerHi);
  const hasAny = hasEn || hasHi;

  // default to available language
  useEffect(() => {
    if (!hasEn && hasHi) setLang('hi');
    if (hasEn && !hasHi) setLang('en');
  }, [hasEn, hasHi]);

  const key = lang === 'hi' ? trailerHi : trailerEn;
  const ytUrl = key ? `https://www.youtube.com/embed/${key}?autoplay=1&rel=0` : null;

  if (!hasAny) return null;

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)} style={{ gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
        Watch trailer
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${title} trailer`}>
            <div className="modal-head">
              <div>
                <div className="eyebrow" style={{ margin: 0 }}>
                  Trailer
                </div>
                <div style={{ fontWeight: 700 }}>{title}</div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {hasEn && hasHi ? (
              <div className="chip-row" style={{ padding: '10px 16px 0' }}>
                <button type="button" className="chip" data-on={lang === 'en'} onClick={() => setLang('en')}>
                  English
                </button>
                <button type="button" className="chip" data-on={lang === 'hi'} onClick={() => setLang('hi')}>
                  Hindi
                </button>
              </div>
            ) : null}

            <div className="yt-frame">
              {ytUrl ? (
                <iframe
                  src={ytUrl}
                  title={`${title} trailer (${lang})`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }} className="muted">
                  Trailer available nahi hai
                </div>
              )}
            </div>

            <div style={{ padding: '10px 16px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a
                href={key ? `https://www.youtube.com/watch?v=${key}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-ghost"
              >
                Open on YouTube ↗
              </a>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
