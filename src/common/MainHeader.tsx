import { faCogs as cogsIcon, faSignOutAlt as logoutIcon } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavBar } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ServersDropdown } from '../servers/ServersDropdown';
import { ShlinkLogo } from './img/ShlinkLogo';

export const MainHeader: FC = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const settingsPath = '/settings';

  return (
    <NavBar
      className="[&]:fixed top-0 z-900"
      brand={(
        <Link to="/" className="[&]:text-white no-underline flex items-center gap-2">
          <ShlinkLogo className="w-7" color="white" /> <small className="font-normal">Shlink</small>
        </Link>
      )}
    >
      <NavBar.MenuItem
        to={settingsPath}
        active={pathname.startsWith(settingsPath)}
        className="flex items-center gap-1.5"
      >
        <FontAwesomeIcon icon={cogsIcon} /> Settings
      </NavBar.MenuItem>
      <ServersDropdown />
      {user && (
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:text-white"
          title={user.email}
        >
          <FontAwesomeIcon icon={logoutIcon} /> 로그아웃
        </button>
      )}
    </NavBar>
  );
};
