import { faCogs as cogsIcon, faSignOutAlt as logoutIcon, faUsers as usersIcon } from '@fortawesome/free-solid-svg-icons';
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
        <FontAwesomeIcon icon={cogsIcon} /> Settings
      </NavBar.MenuItem>
      <ServersDropdown />
      {user?.role === 'admin' && (
        <NavBar.MenuItem
          to="/admin/users"
          active={pathname.startsWith('/admin/users')}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm"
        >
          <FontAwesomeIcon icon={usersIcon} /> 사용자 관리
        </NavBar.MenuItem>
      )}
      {user && (
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/80 hover:text-white whitespace-nowrap"
          title={user.email}
        >
          <FontAwesomeIcon icon={logoutIcon} /> 로그아웃
        </button>
      )}
    </NavBar>
  );
};
