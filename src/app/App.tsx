import { faChartLine, faHouse } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { changeThemeInMarkup, getSystemPreferredTheme } from '@shlinkio/shlink-frontend-kit';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { UserManagementPage } from '../admin/UserManagementPage';
import { AppUpdateBanner } from '../common/AppUpdateBanner';
import { Home } from '../common/Home';
import { MainHeader } from '../common/MainHeader';
import { NotFound } from '../common/NotFound';
import { ShlinkVersionsContainer } from '../common/ShlinkVersionsContainer';
import { ShlinkWebComponentContainer } from '../common/ShlinkWebComponentContainer';
import { CreateServer } from '../servers/CreateServer';
import { EditServer } from '../servers/EditServer';
import { ManageServers } from '../servers/ManageServers';
import { useLoadRemoteServers } from '../servers/reducers/remoteServers';
import { useSettings } from '../settings/reducers/settings';
import { Settings } from '../settings/Settings';
import { forceUpdate } from '../utils/helpers/sw';
import { UtmBuilderPage } from '../utm/UtmBuilderPage';
import { UtmTagManager } from '../utm/UtmTagManager';
import { UtmTemplateManager } from '../utm/UtmTemplateManager';
import { useAppUpdated } from './reducers/appUpdates';

const isUtmRoute = (pathname: string) =>
  pathname.includes('/utm-builder') || pathname.includes('/utm-template-manager') || pathname.includes('/utm-tag-manager');

const getServerIdFromPathname = (pathname: string) => {
  const match = pathname.match(/^\/server\/([^/]+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  return match[1] === 'create' ? null : match[1];
};

export const App: FC = () => {
  const { appUpdated, resetAppUpdate } = useAppUpdated();
  const navigate = useNavigate();

  useLoadRemoteServers();

  const location = useLocation();
  const isHome = location.pathname === '/';
  const onUtmRoute = isUtmRoute(location.pathname);
  const serverIdFromPath = getServerIdFromPathname(location.pathname);

  const floatingTarget = onUtmRoute
    ? '/'
    : serverIdFromPath
      ? `/server/${serverIdFromPath}/utm-builder`
      : '/utm-builder';

  const floatingLabel = onUtmRoute ? 'HOME' : 'UTM 관리';

  const { settings } = useSettings();
  useEffect(() => {
    changeThemeInMarkup(settings.ui?.theme ?? getSystemPreferredTheme());
  }, [settings.ui?.theme]);

  return (
    <div className="h-full">
      <>
        <MainHeader />

        <div className="h-full pt-(--header-height)">
          <div
            data-testid="shlink-wrapper"
            className={clsx(
              'min-h-full pb-[calc(var(--footer-height)+var(--footer-margin))] -mb-[calc(var(--footer-height)+var(--footer-margin))]',
              { 'flex items-center pt-4': isHome },
            )}
          >
            <Routes>
              <Route index element={<Home />} />
              <Route path="/settings">
                {['', '*'].map((path) => <Route key={path} path={path} element={<Settings />} />)}
              </Route>
              <Route path="/manage-servers" element={<ManageServers />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/utm-builder" element={<UtmBuilderPage />} />
              <Route path="/utm-template-manager" element={<UtmTemplateManager />} />
              <Route path="/utm-tag-manager" element={<UtmTagManager />} />
              <Route path="/server/create" element={<CreateServer />} />
              <Route path="/server/:serverId/edit" element={<EditServer />} />
              <Route path="/server/:serverId/utm-builder" element={<UtmBuilderPage />} />
              <Route path="/server/:serverId/utm-template-manager" element={<UtmTemplateManager />} />
              <Route path="/server/:serverId/utm-tag-manager" element={<UtmTagManager />} />
              <Route path="/server/:serverId/*" element={<ShlinkWebComponentContainer />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>

          <div className="h-(--footer-height) mt-(--footer-margin) md:px-4">
            <ShlinkVersionsContainer />
          </div>
        </div>
      </>

      <button
        type="button"
        onClick={() => navigate(floatingTarget)}
        aria-label={onUtmRoute ? 'overview로 이동' : 'UTM 관리로 이동'}
        title={onUtmRoute ? 'overview로 이동' : 'UTM 관리로 이동'}
        className={clsx(
          'fixed right-4 bottom-4 z-50 flex min-h-14 min-w-40 items-center justify-center gap-2 rounded-full px-6 py-3',
          'bg-lm-main text-white shadow-lg transition-colors hover:bg-blue-700 dark:bg-dm-main dark:hover:bg-blue-600',
        )}
      >
        <FontAwesomeIcon icon={onUtmRoute ? faHouse : faChartLine} />
        <span className="text-sm font-bold">{floatingLabel}</span>
      </button>

      <AppUpdateBanner isOpen={appUpdated} onClose={resetAppUpdate} forceUpdate={forceUpdate} />
    </div>
  );
};
