import { clsx } from 'clsx';
import type { FC } from 'react';
import { Link, useLocation, useParams } from 'react-router';

export const UtmManagementMenu: FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const { pathname } = useLocation();

  const prefix = serverId ? `/server/${serverId}` : '';

  const items = [
    { to: `${prefix}/utm-builder`, label: '빌더' },
    { to: `${prefix}/utm-template-manager`, label: '템플릿 관리' },
    { to: `${prefix}/utm-tag-manager`, label: '태그 관리' },
  ];

  return (
    <div className="mb-5 rounded-md border border-lm-border bg-white p-2 dark:border-dm-border dark:bg-dm-primary">
      <p className="mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">UTM 관리 메뉴</p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ to, label }) => {
          const active = pathname === to;

          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'rounded px-3 py-1.5 text-sm no-underline transition-colors',
                active
                  ? 'bg-lm-main text-white dark:bg-dm-main'
                  : 'bg-gray-100 text-(--light-text-color) hover:bg-gray-200 dark:bg-gray-800 dark:text-(--dark-text-color) dark:hover:bg-gray-700',
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
