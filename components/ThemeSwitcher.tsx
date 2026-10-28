'use client';

import { useEffect, useRef, useState } from 'react';

const ACCENTS = ['green', 'cyan', 'red', 'purple', 'amber'] as const;
type Accent = (typeof ACCENTS)[number];

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accent, setAccent] = useState<Accent>('green');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setTheme((root.getAttribute('data-theme') as 'dark' | 'light') || 'dark');
    setAccent((root.getAttribute('data-accent') as Accent) || 'green');
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function applyTheme(next: 'dark' | 'light') {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('cm-theme', next); } catch {}
  }
  function applyAccent(next: Accent) {
    setAccent(next);
    document.documentElement.setAttribute('data-accent', next);
    try { localStorage.setItem('cm-accent', next); } catch {}
  }

  return (
    <div className="pop-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Appearance settings"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18 4.5 4.5 0 0 0 0-9 4.5 4.5 0 0 1 0-9z" />
        </svg>
      </button>

      {open && (
        <div className="pop" role="dialog" aria-label="Appearance">
          <div className="pop-label">Accent</div>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                className={`swatch ${a}`}
                data-on={accent === a}
                aria-label={`Accent ${a}`}
                onClick={() => applyAccent(a)}
              />
            ))}
          </div>
          <div className="pop-label">Mode</div>
          <div className="mode-row">
            <button type="button" className="mode-btn" data-on={theme === 'dark'} onClick={() => applyTheme('dark')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
              Dark
            </button>
            <button type="button" className="mode-btn" data-on={theme === 'light'} onClick={() => applyTheme('light')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
              </svg>
              Light
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
