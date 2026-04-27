import { faCogs as cogsIcon, faLanguage, faSignOutAlt as logoutIcon, faUsers as usersIcon } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavBar } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { usePendingUsersCount } from '../admin/usePendingUsersCount';
import { useAuth } from '../auth/AuthContext';
import type { Locale } from '../i18n';
import { useLocale, useT } from '../i18n';
import { ServersDropdown } from '../servers/ServersDropdown';
import { ShlinkLogo } from './img/ShlinkLogo';

const NEXT_LOCALE: Record<Locale, Locale> = { ko: 'en', en: 'ko' };

export const MainHeader: FC = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { count: pendingUsersCount } = usePendingUsersCount();

  const settingsPath = '/settings';
  const localeLabelKey = locale === 'ko' ? 'language.en' : 'language.ko';

  return (
    <NavBar
      className="[&]:fixed top-0 z-900"
      brand={(
        <Link to="/" className="[&]:text-white no-underline flex items-center gap-2 whitespace-nowrap">
          <ShlinkLogo className="w-7" color="white" /> <small className="font-normal">Shlink</small>
        </Link>
      )}
    >
      <NavBar.MenuItem
        to={settingsPath}
        active={pathname.startsWith(settingsPath)}
        className="flex items-center gap-1.5 whitespace-nowrap"
      >
        <FontAwesomeIcon icon={cogsIcon} /> {t('header.settings')}
      </NavBar.MenuItem>
      <ServersDropdown />
      {user?.role === 'admin' && (
        <NavBar.MenuItem
          to="/admin/users"
          active={pathname.startsWith('/admin/users')}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm"
        >
          <FontAwesomeIcon icon={usersIcon} /> {t('header.userManagement')}
          {pendingUsersCount > 0 && (
            <span
              data-testid="pending-users-badge"
              aria-label={t('header.userManagement.pendingBadge', { count: pendingUsersCount })}
              className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white"
            >
              {pendingUsersCount}
            </span>
          )}
        </NavBar.MenuItem>
      )}
      <li role="none" className="flex">
        <button
          type="button"
          role="menuitem"
          onClick={() => setLocale(NEXT_LOCALE[locale])}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:text-white whitespace-nowrap"
          title={t('header.languageToggle')}
          aria-label={t('header.languageToggle')}
        >
          <FontAwesomeIcon icon={faLanguage} /> {t(localeLabelKey)}
        </button>
      </li>
      {user && (
        <li role="none" className="flex">
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:text-white whitespace-nowrap"
            title={user.email}
          >
            <FontAwesomeIcon icon={logoutIcon} /> {t('header.logout')}
          </button>
        </li>
      )}
    </NavBar>
  );
};
