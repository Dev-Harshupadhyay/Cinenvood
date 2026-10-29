'use client';
import { signOut } from 'next-auth/react';

export default function AdminLogoutButton() {
  return (
    <button type="button" className="admin-logout" onClick={() => signOut({ callbackUrl: '/' })}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
      Sign out
    </button>
  );
}
