'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { initials, avatarGradient, avatarSrc } from '@/lib/format';
import GuestChip from './GuestChip';

type Props = {
  user: { name: string | null; email: string; image: string | null; role: 'USER' | 'ADMIN' } | null;
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!user) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <GuestChip />
        <Link href="/login" className="btn btn-sm btn-primary">
          Sign in with Google
        </Link>
      </div>
    );
  }

  return (
    <div className="pop-wrap" ref={ref}>
      <button type="button" className="user-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Account menu">
        <span className="avatar" style={{ background: avatarGradient(user.email) }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc(user.image) ?? ''} alt="" />
          ) : (
            initials(user.name ?? user.email)
          )}
        </span>
        <span className="uname">{user.name ?? 'Member'}</span>
      </button>

      {open && (
        <div className="pop menu-pop">
          <div className="menu-head">
            <div className="mn">{user.name ?? 'Member'}</div>
            <div className="me">{user.email}</div>
          </div>
          <Link href="/dashboard" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </Link>
          <Link href="/dashboard/reviews" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8z" />
            </svg>
            My reviews
          </Link>
          <Link href="/dashboard?tab=profile" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.4" />
              <path d="M4.8 20c0-3.4 3.2-5.6 7.2-5.6s7.2 2.2 7.2 5.6" />
            </svg>
            Edit profile
          </Link>
          <Link href="/dashboard/watchlist" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path d="M6 4h12v16l-6-4-6 4z" />
            </svg>
            Watchlist
          </Link>
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="menu-item" onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path d="M12 3l7 3v6c0 4.2-3 7.6-7 9-4-1.4-7-4.8-7-9V6z" />
              </svg>
              Admin panel
            </Link>
          )}
          <button type="button" className="menu-item danger" onClick={() => signOut({ callbackUrl: '/' })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path d="M15 12H3m0 0 4-4m-4 4 4 4" />
              <path d="M11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
