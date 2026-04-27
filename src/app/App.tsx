import { changeThemeInMarkup, getSystemPreferredTheme } from '@shlinkio/shlink-frontend-kit';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { UserManagementPage } from '../admin/UserManagementPage';
import { AppUpdateBanner } from '../common/AppUpdateBanner';
import { Home } from '../common/Home';
import { MainHeader } from '../common/MainHeader';
import { NotFound } from '../common/NotFound';
import { ServerInfoFloating } from '../common/ServerInfoFloating';
import { ShlinkVersionsContainer } from '../common/ShlinkVersionsContainer';
import { ShlinkWebComponentContainer } from '../common/ShlinkWebComponentContainer';
import { UnifiedSidebar } from '../common/UnifiedSidebar';
import { CreateServer } from '../servers/CreateServer';
import { EditServer } from '../servers/EditServer';
import { ManageServers } from '../servers/ManageServers';
import { useLoadRemoteServers } from '../servers/reducers/remoteServers';
import { useSettings } from '../settings/reducers/settings';
import { Settings } from '../settings/Settings';
import { forceUpdate } from '../utils/helpers/sw';
import { UtmBuilderPage } from '../utm/UtmBuilderPage';
import { UtmBulkBuilderPage } from '../utm/UtmBulkBuilderPage';
import { UtmTagManager } from '../utm/UtmTagManager';
import { UtmTemplateManager } from '../utm/UtmTemplateManager';
import { useAppUpdated } from './reducers/appUpdates';

export const App: FC = () => {
  const { appUpdated, resetAppUpdate } = useAppUpdated();

  useLoadRemoteServers();

  const location = useLocation();
  const isHome = location.pathname === '/';

  const { settings } = useSettings();
  useEffect(() => {
    changeThemeInMarkup(settings.ui?.theme ?? getSystemPreferredTheme());
  }, [settings.ui?.theme]);

  return (
    <div className="h-full">
      <MainHeader />
      <UnifiedSidebar />

      <div className="h-full pt-(--header-height)">
        <div
          data-testid="shlink-wrapper"
          className={clsx(
            'min-h-full pb-[calc(var(--footer-height)+var(--footer-margin))] -mb-[calc(var(--footer-height)+var(--footer-margin))]',
            'md:pl-(--aside-menu-width)',
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
            <Route path="/utm-bulk-builder" element={<UtmBulkBuilderPage />} />
            <Route path="/utm-template-manager" element={<UtmTemplateManager />} />
            <Route path="/utm-tag-manager" element={<UtmTagManager />} />
            <Route path="/server/create" element={<CreateServer />} />
            <Route path="/server/:serverId/edit" element={<EditServer />} />
            <Route path="/server/:serverId/utm-builder" element={<UtmBuilderPage />} />
            <Route path="/server/:serverId/utm-bulk-builder" element={<UtmBulkBuilderPage />} />
            <Route path="/server/:serverId/utm-template-manager" element={<UtmTemplateManager />} />
            <Route path="/server/:serverId/utm-tag-manager" element={<UtmTagManager />} />
            <Route path="/server/:serverId/*" element={<ShlinkWebComponentContainer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <div className="h-(--footer-height) mt-(--footer-margin) md:px-4 md:pl-(--aside-menu-width)">
          <ShlinkVersionsContainer />
        </div>
      </div>

      <ServerInfoFloating />

      <AppUpdateBanner isOpen={appUpdated} onClose={resetAppUpdate} forceUpdate={forceUpdate} />
    </div>
  );
};
