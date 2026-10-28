import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { t } from '@/lib/i18n';
import { getLang } from '@/lib/i18n-server';
import NavLinks from './NavLinks';
import SearchBox from './SearchBox';
import ThemeSwitcher from './ThemeSwitcher';
import LangSwitcher from './LangSwitcher';
import UserMenu from './UserMenu';

export default async function Header() {
  const [sessionUser, lang] = await Promise.all([getSessionUser(), getLang()]);
  const items = [
    { href: '/', label: t(lang, 'home') },
    { href: '/movies', label: t(lang, 'movies') },
    { href: '/reviews', label: t(lang, 'reviews') },
    { href: '/community', label: t(lang, 'community') }
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="CineMood home">
          CINE<span className="dot">·</span>MOOD<em>review</em>
        </Link>
        <NavLinks items={items} />
        <SearchBox placeholder={t(lang, 'search')} />
        <div className="header-right">
          <Link href="/about" className="header-about" title={t(lang, 'aboutSite')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 7.6v.6" />
            </svg>
            <span>{t(lang, 'aboutSite')}</span>
          </Link>
          <LangSwitcher />
          <ThemeSwitcher />
          <UserMenu
            user={
              sessionUser
                ? {
                    name: sessionUser.name ?? null,
                    email: sessionUser.email!,
                    image: sessionUser.image ?? null,
                    role: sessionUser.role
                  }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}
