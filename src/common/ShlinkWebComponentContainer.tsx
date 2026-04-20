import type { TagColorsStorage } from '@shlinkio/shlink-web-component';
import {
  ShlinkSidebarToggleButton,
  ShlinkSidebarVisibilityProvider,
  ShlinkWebComponent,
} from '@shlinkio/shlink-web-component';
import type { FC } from 'react';
import { memo } from 'react';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { withDependencies } from '../container/context';
import { isReachableServer } from '../servers/data';
import { ServerError } from '../servers/helpers/ServerError';
import { withSelectedServer } from '../servers/helpers/withSelectedServer';
import { useSelectedServer } from '../servers/reducers/selectedServer';
import { useSettings } from '../settings/reducers/settings';
import { UtmBuilderPage } from '../utm/UtmBuilderPage';
import { NotFound } from './NotFound';

export type ShlinkWebComponentContainerProps = {
  TagColorsStorage: TagColorsStorage;
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

const normalizeHomePath = (path: string) => {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.split(/[?#]/, 1)[0] ?? withLeadingSlash;
};

const isUtmBuilderPath = (path: string) => normalizeHomePath(path).includes('/utm-builder');

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
  const reachableServer = isReachableServer(selectedServer);
  const routesPrefix = reachableServer ? `/server/${selectedServer.id}` : '';

  if (!reachableServer) {
    return <ServerError />;
  }

  return (
    <ShlinkSidebarVisibilityProvider>
      <ShlinkSidebarToggleButton className="fixed top-3.5 left-3 z-901" />
      <ShlinkWebComponent
        serverVersion={selectedServer.version}
        apiClient={buildShlinkApiClient(selectedServer)}
        settings={settings}
        routesPrefix={routesPrefix}
        tagColorsStorage={tagColorsStorage}
        createNotFound={(nonPrefixedHomePath: string) => {
          if (isUtmBuilderPath(nonPrefixedHomePath)) {
            return <UtmBuilderPage />;
          }

          return <NotFound to={`${routesPrefix}${nonPrefixedHomePath}`}>List short URLs</NotFound>;
        }}
        autoSidebarToggle={false}
      />
    </ShlinkSidebarVisibilityProvider>
  );
}));

export const ShlinkWebComponentContainer = withDependencies(ShlinkWebComponentContainerBase, [
  'buildShlinkApiClient',
  'TagColorsStorage',
]);
