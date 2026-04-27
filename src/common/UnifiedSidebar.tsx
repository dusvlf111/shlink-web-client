import {
  faChartLine,
  faClipboardList,
  faGlobe,
  faHouse,
  faLayerGroup,
  faLink,
  faList,
  faTag,
  faTags,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import type { MessageKey } from '../i18n';
import { useT } from '../i18n';
import type { ServersMap } from '../servers/data';
import { useServers } from '../servers/reducers/servers';

type SidebarItem = {
  /** Path appended to the optional server prefix. */
  to: string;
  /** Translation key for the visible label. */
  labelKey: MessageKey;
  icon: IconDefinition;
  /** Extra path that should also count as active (e.g. paginated routes). */
  matchPrefix?: string;
  /** When true, prepend the `/server/<id>` prefix; otherwise the path is absolute. */
  scoped?: boolean;
  /** When true the item is disabled if no server is selected. */
  requiresServer?: boolean;
  /** Optional flip when the icon needs to face the other direction. */
  iconFlip?: 'horizontal' | 'vertical';
};

// Mirrors the menu items of the @shlinkio/shlink-web-component v0.18 internal sidebar
// (node_modules/@shlinkio/shlink-web-component/dist/index.js:291-329) — keep paths and
// icons in sync with future package upgrades.
const SHORT_URL_ITEMS: readonly SidebarItem[] = [
  { to: '/overview', labelKey: 'sidebar.shortUrls.overview', icon: faHouse, scoped: true, requiresServer: true },
  { to: '/list-short-urls/1', labelKey: 'sidebar.shortUrls.list', icon: faList, matchPrefix: '/list-short-urls', scoped: true, requiresServer: true },
  { to: '/create-short-url', labelKey: 'sidebar.shortUrls.create', icon: faLink, iconFlip: 'horizontal', scoped: true, requiresServer: true },
  { to: '/manage-tags', labelKey: 'sidebar.shortUrls.tags', icon: faTags, scoped: true, requiresServer: true },
  { to: '/manage-domains', labelKey: 'sidebar.shortUrls.domains', icon: faGlobe, scoped: true, requiresServer: true },
];

const UTM_ITEMS: readonly SidebarItem[] = [
  { to: '/utm-builder', labelKey: 'sidebar.utm.builder', icon: faWandMagicSparkles, scoped: true },
  { to: '/utm-bulk-builder', labelKey: 'sidebar.utm.bulk', icon: faLayerGroup, scoped: true },
  { to: '/utm-template-manager', labelKey: 'sidebar.utm.templates', icon: faClipboardList, scoped: true },
  { to: '/utm-tag-manager', labelKey: 'sidebar.utm.tags', icon: faTag, scoped: true },
];

const buildHref = (item: SidebarItem, prefix: string) =>
  item.scoped ? `${prefix}${item.to}` : item.to;

const pickFallbackServerId = (servers: ServersMap): string | null => {
  const serverList = Object.values(servers);
  const autoConnect = serverList.find((server) => server.autoConnect);
  return autoConnect?.id ?? serverList[0]?.id ?? null;
};

const isActive = (pathname: string, href: string, matchPrefix?: string) => {
  if (matchPrefix && pathname.includes(matchPrefix)) {
    return true;
  }
  return pathname === href;
};

const NavRow: FC<{
  item: SidebarItem;
  serverPrefix: string;
  hasServer: boolean;
  active: boolean;
  label: string;
}> = ({ item, serverPrefix, hasServer, active, label }) => {
  const href = buildHref(item, serverPrefix);
  const disabled = item.requiresServer && !hasServer;
  const className = clsx(
    'flex items-center gap-2',
    'no-underline rounded-none px-5 py-2.5',
    {
      'text-white bg-lm-main dark:bg-dm-main': active,
      'highlight:bg-lm-secondary highlight:dark:bg-dm-secondary': !active && !disabled,
      'opacity-40 pointer-events-none': disabled,
    },
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        <FontAwesomeIcon icon={item.icon} flip={item.iconFlip} />
        {label}
      </span>
    );
  }

  return (
    <Link to={href} className={className} aria-current={active ? 'page' : undefined}>
      <FontAwesomeIcon icon={item.icon} flip={item.iconFlip} />
      {label}
    </Link>
  );
};

const SectionLabel: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
    {children}
  </p>
);

const SidebarDivider: FC = () => (
  <div className="my-2 border-t border-lm-border dark:border-dm-border" aria-hidden="true" />
);

export const UnifiedSidebar: FC = () => {
  const t = useT();
  const { pathname } = useLocation();
  const { serverId } = useParams<{ serverId: string }>();
  const { servers } = useServers();
  const fallbackServerId = useMemo(() => pickFallbackServerId(servers), [servers]);
  const effectiveServerId = serverId ?? fallbackServerId;
  const serverPrefix = effectiveServerId ? `/server/${effectiveServerId}` : '';
  const hasServer = !!effectiveServerId;

  return (
    <aside
      data-testid="unified-sidebar"
      className={clsx(
        'w-(--aside-menu-width) bg-lm-primary dark:bg-dm-primary',
        'pt-[15px] md:pt-[30px] pb-[10px]',
        'fixed bottom-0 top-(--header-height) z-890',
        'shadow-aside-menu-mobile md:shadow-aside-menu',
        'overflow-y-auto',
        'max-md:hidden',
      )}
    >
      <nav
        aria-label={`${t('sidebar.section.shortUrls')} / ${t('sidebar.section.utm')}`}
        className="flex flex-col h-full"
      >
        <SectionLabel>{t('sidebar.section.shortUrls')}</SectionLabel>
        {SHORT_URL_ITEMS.map((item) => {
          const href = buildHref(item, serverPrefix);
          return (
            <NavRow
              key={item.to}
              item={item}
              serverPrefix={serverPrefix}
              hasServer={hasServer}
              active={isActive(pathname, href, item.matchPrefix)}
              label={t(item.labelKey)}
            />
          );
        })}

        <SidebarDivider />

        <SectionLabel>
          <FontAwesomeIcon icon={faChartLine} className="mr-1.5 text-[10px]" />
          {t('sidebar.section.utm')}
        </SectionLabel>
        {UTM_ITEMS.map((item) => {
          const href = buildHref(item, serverPrefix);
          return (
            <NavRow
              key={item.to}
              item={item}
              serverPrefix={serverPrefix}
              hasServer={hasServer}
              active={isActive(pathname, href, item.matchPrefix)}
              label={t(item.labelKey)}
            />
          );
        })}
      </nav>
    </aside>
  );
};
