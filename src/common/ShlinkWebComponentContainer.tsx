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
import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
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
  const [utmMenuMount, setUtmMenuMount] = useState<HTMLElement | null>(null);
  const reachableServer = isReachableServer(selectedServer);
  const routesPrefix = reachableServer ? `/server/${selectedServer.id}` : '';
  const utmPath = reachableServer ? `${routesPrefix}/utm-builder` : '/utm-builder';

  useEffect(() => {
    let createdMount: HTMLElement | null = null;

    const ensureMount = () => {
      const listShortUrlsLink = document.querySelector<HTMLAnchorElement>(`a[href="${routesPrefix}/list-short-urls/1"]`);

      if (!listShortUrlsLink) {
        return false;
      }

      let mount = listShortUrlsLink.parentElement?.querySelector<HTMLElement>('[data-utm-menu-mount="true"]') ?? null;

      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.utmMenuMount = 'true';
        listShortUrlsLink.insertAdjacentElement('afterend', mount);
        createdMount = mount;
      }

      setUtmMenuMount(mount);
      return true;
    };

    if (ensureMount()) {
      return () => {
        setUtmMenuMount(null);
        createdMount?.remove();
      };
    }

    const observer = new MutationObserver(() => {
      if (ensureMount()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      setUtmMenuMount(null);
      createdMount?.remove();
    };
  }, [routesPrefix]);

  if (!reachableServer) {
    return <ServerError />;
  }

  return (
    <ShlinkSidebarVisibilityProvider>
      <ShlinkSidebarToggleButton className="fixed top-3.5 left-3 z-901" />
      {utmMenuMount && createPortal(
        <Link
          to={utmPath}
          className={clsx(
            'flex items-center gap-2',
            'no-underline rounded-none px-5 py-2.5',
            {
              'text-white bg-lm-main dark:bg-dm-main': pathname.includes('/utm-builder'),
              'highlight:bg-lm-secondary highlight:dark:bg-dm-secondary': !pathname.includes('/utm-builder'),
            },
          )}
        >
          <FontAwesomeIcon icon={chartLineIcon} /> UTM 관리
        </Link>,
        utmMenuMount,
      )}
      <ShlinkWebComponent
        serverVersion={selectedServer.version}
        apiClient={buildShlinkApiClient(selectedServer)}
        settings={settings}
        routesPrefix={routesPrefix}
        tagColorsStorage={tagColorsStorage}
        createNotFound={(nonPrefixedHomePath: string) => {
          if (nonPrefixedHomePath.startsWith('/utm-builder')) {
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
