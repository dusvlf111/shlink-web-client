import { faChartLine, faChartPie, faList, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useT } from '../i18n';
import {
  fetchPublicShareToken,
  isShareTokenExpired,
  type ShareSnapshot,
  type ShareToken,
} from './services/shareTokenService';
import {
  buildVisitsTimeline,
  visitsByBrowser,
  visitsByCity,
  visitsByCountry,
  visitsByOs,
  visitsByReferer,
  type Bucket,
} from './visitsAnalytics';

const formatDateTime = (iso?: string) => {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
};

type Status = 'loading' | 'ready' | 'expired' | 'not-found' | 'invalid';
type SectionKey = 'byTime' | 'byContext' | 'byLocation' | 'list';

const SHARE_TOKEN_ID_PATTERN = /^[a-z0-9]{10,20}$/i;
const SHARE_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

const hasValidShareParams = (tokenId: string, token: string): boolean =>
  SHARE_TOKEN_ID_PATTERN.test(tokenId) && SHARE_TOKEN_PATTERN.test(token);

const Metric: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">{value}</p>
  </div>
);

const computeMetrics = (snapshot: ShareSnapshot | undefined) => {
  const visits = snapshot?.data.data ?? [];
  const total = visits.length;
  const nonBots = visits.filter((visit) => !visit.potentialBot).length;
  const uniqueDays = new Set(
    visits.map((visit) => (visit.date ? visit.date.slice(0, 10) : '')).filter(Boolean),
  ).size;
  return { total, nonBots, uniqueDays };
};

const TabButton: FC<{
  active: boolean;
  icon: IconDefinition;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
      active
        ? 'border-lm-main text-lm-main dark:border-dm-main dark:text-white'
        : 'border-transparent text-gray-500 hover:text-(--light-text-color) dark:text-gray-400 dark:hover:text-(--dark-text-color)',
    )}
  >
    <FontAwesomeIcon icon={icon} /> {label}
  </button>
);

const HorizontalBars: FC<{ buckets: Bucket[]; emptyLabel: string; max?: number }> = ({
  buckets,
  emptyLabel,
  max = 10,
}) => {
  if (buckets.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }
  const maxCount = buckets.reduce((acc, bucket) => Math.max(acc, bucket.count), 0);
  const slice = buckets.slice(0, max);
  return (
    <ul className="space-y-2">
      {slice.map((bucket) => {
        const percent = maxCount === 0 ? 0 : Math.round((bucket.count / maxCount) * 100);
        return (
          <li key={bucket.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs text-(--light-text-color) dark:text-(--dark-text-color)">
              <span className="truncate" title={bucket.key}>{bucket.key}</span>
              <span className="font-mono text-gray-500 dark:text-gray-400">{bucket.count}</span>
            </div>
            <div className="h-2 rounded bg-lm-primary/40 dark:bg-dm-main">
              <div
                className="h-2 rounded bg-lm-main dark:bg-dm-main"
                style={{ width: `${percent}%`, backgroundColor: 'var(--brand-color, #4361ee)' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const TimelineChart: FC<{ visits: ShareSnapshot['data']['data']; emptyLabel: string }> = ({ visits, emptyLabel }) => {
  const timeline = useMemo(() => buildVisitsTimeline(visits), [visits]);
  if (timeline.values.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }
  const max = Math.max(...timeline.values, 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-40">
        {timeline.values.map((count, index) => {
          const height = Math.round((count / max) * 100);
          const label = `${timeline.labels[index]} — ${count}`;
          return (
            <div
              key={timeline.labels[index]}
              className="flex-1 min-w-1 bg-lm-main/80 hover:bg-lm-main dark:bg-dm-main dark:hover:bg-blue-500 rounded-t"
              style={{ height: `${height}%` }}
              title={label}
              aria-label={label}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-1">
        <span>{timeline.labels[0]}</span>
        <span>{timeline.labels[timeline.labels.length - 1]}</span>
      </div>
    </div>
  );
};

export const PublicShareStatsPage: FC = () => {
  const t = useT();
  const { tokenId } = useParams<{ tokenId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [share, setShare] = useState<ShareToken | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('byTime');

  useEffect(() => {
    if (!tokenId || !token) {
      setStatus('invalid');
      return;
    }
    if (!hasValidShareParams(tokenId, token)) {
      setStatus('invalid');
      return;
    }
    let cancelled = false;
    void fetchPublicShareToken(tokenId, token)
      .then((result) => {
        if (cancelled) return;
        if (isShareTokenExpired(result)) {
          setStatus('expired');
          return;
        }
        setShare(result);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId, token]);

  const metrics = useMemo(() => computeMetrics(share?.snapshot), [share?.snapshot]);
  const visits = useMemo(() => share?.snapshot?.data.data ?? [], [share?.snapshot]);
  const recentVisits = useMemo(() => visits.slice(0, 50), [visits]);

  const directLabel = t('share.public.share.direct');
  const unknownLabel = t('share.public.share.unknown');

  const refererBuckets = useMemo(
    () => visitsByReferer(visits, directLabel, unknownLabel),
    [visits, directLabel, unknownLabel],
  );
  const osBuckets = useMemo(() => visitsByOs(visits, unknownLabel), [visits, unknownLabel]);
  const browserBuckets = useMemo(() => visitsByBrowser(visits, unknownLabel), [visits, unknownLabel]);
  const countryBuckets = useMemo(() => visitsByCountry(visits, unknownLabel), [visits, unknownLabel]);
  const cityBuckets = useMemo(() => visitsByCity(visits, unknownLabel), [visits, unknownLabel]);

  return (
    <div className="min-h-screen bg-(--light-body-color) dark:bg-(--dark-body-color)">
      <header className="border-b border-lm-border bg-white px-6 py-4 dark:border-dm-border dark:bg-dm-primary">
        <h1 className="text-xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
          {t('share.public.title')}
          {share?.label && (
            <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">— {share.label}</span>
          )}
        </h1>
        {share && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('share.public.snapshotAt')}: {formatDateTime(share.snapshotAt)}
            {share.expiresAt && (
              <span className="ml-3">{t('share.public.expiresAt')}: {formatDateTime(share.expiresAt)}</span>
            )}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {status === 'loading' && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">…</p>
        )}

        {status === 'invalid' && (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-center text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
            {t('share.public.invalidLink')}
          </div>
        )}

        {status === 'not-found' && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            {t('share.public.notFound')}
          </div>
        )}

        {status === 'expired' && (
          <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-center text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
            {t('share.public.expired')}
          </div>
        )}

        {status === 'ready' && share && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label={t('share.public.metric.total')} value={metrics.total.toLocaleString()} />
              <Metric label={t('share.public.metric.nonBots')} value={metrics.nonBots.toLocaleString()} />
              <Metric label={t('share.public.metric.uniqueDays')} value={metrics.uniqueDays.toLocaleString()} />
            </div>

            <nav className="flex border-b border-lm-border dark:border-dm-border">
              <TabButton
                active={activeSection === 'byTime'}
                icon={faChartLine}
                label={t('share.public.section.byTime')}
                onClick={() => setActiveSection('byTime')}
              />
              <TabButton
                active={activeSection === 'byContext'}
                icon={faChartPie}
                label={t('share.public.section.byContext')}
                onClick={() => setActiveSection('byContext')}
              />
              <TabButton
                active={activeSection === 'byLocation'}
                icon={faMapMarkedAlt}
                label={t('share.public.section.byLocation')}
                onClick={() => setActiveSection('byLocation')}
              />
              <TabButton
                active={activeSection === 'list'}
                icon={faList}
                label={t('share.public.section.list')}
                onClick={() => setActiveSection('list')}
              />
            </nav>

            {activeSection === 'byTime' && (
              <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('share.public.section.byTime')}
                </h2>
                <TimelineChart visits={visits} emptyLabel={t('share.public.byTime.empty')} />
              </section>
            )}

            {activeSection === 'byContext' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                  <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                    {t('share.public.byContext.referer')}
                  </h2>
                  <HorizontalBars buckets={refererBuckets} emptyLabel={t('share.public.empty')} />
                </section>
                <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                  <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                    {t('share.public.byContext.os')}
                  </h2>
                  <HorizontalBars buckets={osBuckets} emptyLabel={t('share.public.empty')} />
                </section>
                <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                  <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                    {t('share.public.byContext.browser')}
                  </h2>
                  <HorizontalBars buckets={browserBuckets} emptyLabel={t('share.public.empty')} />
                </section>
              </div>
            )}

            {activeSection === 'byLocation' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                  <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                    {t('share.public.byLocation.country')}
                  </h2>
                  <HorizontalBars buckets={countryBuckets} emptyLabel={t('share.public.empty')} />
                </section>
                <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                  <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                    {t('share.public.byLocation.city')}
                  </h2>
                  <HorizontalBars buckets={cityBuckets} emptyLabel={t('share.public.empty')} />
                </section>
              </div>
            )}

            {activeSection === 'list' && (
              <section className="rounded border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
                <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('share.public.recent')}
                </h2>
                {recentVisits.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('share.public.empty')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400">
                          <th className="px-2 py-1">{t('share.public.col.date')}</th>
                          <th className="px-2 py-1">{t('share.public.col.country')}</th>
                          <th className="px-2 py-1">{t('share.public.col.city')}</th>
                          <th className="px-2 py-1">{t('share.public.col.referer')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentVisits.map((visit, index) => (
                          <tr
                            key={`${visit.date}-${index}`}
                            className="border-t border-lm-border/50 dark:border-dm-border/50"
                          >
                            <td className="px-2 py-1 text-(--light-text-color) dark:text-(--dark-text-color)">
                              {formatDateTime(visit.date)}
                            </td>
                            <td className="px-2 py-1">{visit.visitLocation?.countryName ?? '—'}</td>
                            <td className="px-2 py-1">{visit.visitLocation?.cityName ?? '—'}</td>
                            <td className="px-2 py-1 truncate max-w-[200px]">{visit.referer || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-lm-border px-6 py-4 text-center text-[11px] text-gray-400 dark:border-dm-border dark:text-gray-500">
        {t('share.public.poweredBy')}
      </footer>
    </div>
  );
};
