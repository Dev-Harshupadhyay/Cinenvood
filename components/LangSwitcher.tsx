'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LANGS, LANG_COOKIE, type Lang } from '@/lib/i18n';

function readCookie(): Lang {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : 'en';
  return v === 'hi' || v === 'hinglish' ? v : 'en';
}

export default function LangSwitcher() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => setLang(readCookie()), []);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  function pick(next: Lang) {
    document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    setLang(next);
    setOpen(false);
    start(() => router.refresh());
  }

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="lang-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="icon-btn lang-btn"
        aria-label={`Language: ${current.label}`}
        aria-expanded={open}
        data-pending={pending}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="lang-code">{current.short}</span>
      </button>

      {open ? (
        <div className="popover lang-pop" role="menu">
          <div className="pop-title">Language</div>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === lang}
              data-active={l.code === lang}
              className="lang-item"
              onClick={() => pick(l.code)}
            >
              <span>{l.label}</span>
              <small>{l.short}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
