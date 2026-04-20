import { faChartLine as chartLineIcon } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { TagColorsStorage } from '@shlinkio/shlink-web-component';
import {
  ShlinkSidebarToggleButton,
  ShlinkSidebarVisibilityProvider,
  ShlinkWebComponent,
} from '@shlinkio/shlink-web-component';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { memo } from 'react';
import { Link, useLocation } from 'react-router';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { withDependencies } from '../container/context';
import { isReachableServer } from '../servers/data';
import { ServerError } from '../servers/helpers/ServerError';
import { withSelectedServer } from '../servers/helpers/withSelectedServer';
import { useSelectedServer } from '../servers/reducers/selectedServer';
import { useSettings } from '../settings/reducers/settings';
import { NotFound } from './NotFound';

export type ShlinkWebComponentContainerProps = {
  TagColorsStorage: TagColorsStorage;
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

const ShlinkWebComponentContainerBase: FC<
  ShlinkWebComponentContainerProps
// FIXME Using `memo` here to solve a flickering effect in charts.
//       memo is probably not the right solution. The root cause is the withSelectedServer HOC, but I couldn't fix the
//       extra rendering there.
//       This should be revisited at some point.
> = withSelectedServer(memo(({
  buildShlinkApiClient,
  TagColorsStorage: tagColorsStorage,
}) => {
  const { selectedServer } = useSelectedServer();
  const { settings } = useSettings();
  const { pathname } = useLocation();

  if (!isReachableServer(selectedServer)) {
    return <ServerError />;
  }

  const routesPrefix = `/server/${selectedServer.id}`;
  const utmPath = `${routesPrefix}/utm-builder`;
  return (
    <ShlinkSidebarVisibilityProvider>
      <ShlinkSidebarToggleButton className="fixed top-3.5 left-3 z-901" />
      <Link
        to={utmPath}
        className={clsx(
          'max-md:hidden fixed z-891 left-0 w-(--aside-menu-width)',
          'no-underline px-5 py-2.5 flex items-center gap-2',
          'top-[calc(var(--header-height)+118px)]',
          {
            'text-white bg-lm-main dark:bg-dm-main': pathname.includes('/utm-builder'),
            'text-(--light-text-color) hover:bg-lm-secondary hover:dark:bg-dm-secondary': !pathname.includes('/utm-builder'),
          },
        )}
      >
        <FontAwesomeIcon icon={chartLineIcon} /> UTM 관리
      </Link>
      <ShlinkWebComponent
        serverVersion={selectedServer.version}
        apiClient={buildShlinkApiClient(selectedServer)}
        settings={settings}
        routesPrefix={routesPrefix}
        tagColorsStorage={tagColorsStorage}
        createNotFound={(nonPrefixedHomePath: string) => (
          <NotFound to={`${routesPrefix}${nonPrefixedHomePath}`}>List short URLs</NotFound>
        )}
        autoSidebarToggle={false}
      />
    </ShlinkSidebarVisibilityProvider>
  );
}));

export const ShlinkWebComponentContainer = withDependencies(ShlinkWebComponentContainerBase, [
  'buildShlinkApiClient',
  'TagColorsStorage',
]);
