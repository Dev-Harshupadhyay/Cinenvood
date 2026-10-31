'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/',
    label: 'Home',
    icon: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />
  },
  {
    href: '/movies',
    label: 'Movies',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
      </>
    )
  },
  {
    href: '/jarvis',
    label: 'Jarvis',
    icon: <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z" />
  },
  {
    href: '/reviews',
    label: 'Reviews',
    icon: <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
  },
  {
    href: '/community',
    label: 'People',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.1 2.7-5 6-5s6 1.9 6 5" />
        <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.4c2.1.5 3.5 2.1 3.5 4.6" />
      </>
    )
  },
  {
    href: '/dashboard',
    label: 'You',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M4.5 20c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8" />
      </>
    )
  }
];

/** App-style bottom tab bar — mobile & tablet only (≤900px). */
export default function MobileNav() {
  const pathname = usePathname() || '/';

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="tabbar-item" data-active={active ? 'true' : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {tab.icon}
            </svg>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
