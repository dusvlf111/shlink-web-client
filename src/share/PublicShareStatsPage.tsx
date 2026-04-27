import { faChartLine, faChartPie, faEye, faGlobe, faList, faMapMarkedAlt, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

const Metric: FC<{ label: string; value: string | number; icon: IconDefinition; tone: 'blue' | 'green' | 'purple' }> = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
    <p className="text-xs font-medium text-[#86868b]">{label}</p>
    <p className="mt-2 text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</p>
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
      'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all',
      active
        ? 'bg-white text-[#1d1d1f] shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'
        : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]',
    )}
  >
    <FontAwesomeIcon icon={icon} className="text-xs" /> {label}
  </button>
);

const TONE_COLORS: Record<'blue' | 'green' | 'purple', string> = {
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#a855f7',
};

const HorizontalBars: FC<{ buckets: Bucket[]; emptyLabel: string; tone?: 'blue' | 'green' | 'purple'; max?: number }> = ({
  buckets,
  emptyLabel,
  tone = 'blue',
  max = 10,
}) => {
  if (buckets.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }
  const slice = buckets.slice(0, max);
  const fill = TONE_COLORS[tone];
  const total = buckets.reduce((acc, bucket) => acc + bucket.count, 0);

  return (
    <div style={{ width: '100%', height: Math.max(slice.length * 36, 120) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={slice.map((bucket) => ({
            ...bucket,
            share: total === 0 ? 0 : Math.round((bucket.count / total) * 100),
          }))}
          layout="vertical"
          margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.06} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="key"
            width={120}
            tick={{ fontSize: 12, fill: 'currentColor', fillOpacity: 0.75 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', fillOpacity: 0.04 }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.3)',
              fontSize: 12,
            }}
            formatter={(value, _name, payload) => {
              const numericValue = typeof value === 'number' ? value : Number(value);
              const point = (payload as { payload?: { key?: string; share?: number } } | undefined)?.payload;
              return [
                `${numericValue.toLocaleString()}회 (${point?.share ?? 0}%)`,
                point?.key ?? '',
              ];
            }}
            labelFormatter={() => ''}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={fill} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const TimelineChart: FC<{ visits: ShareSnapshot['data']['data']; emptyLabel: string }> = ({ visits, emptyLabel }) => {
  const timeline = useMemo(() => buildVisitsTimeline(visits), [visits]);
  if (timeline.values.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }

  const data = timeline.labels.map((label, index) => ({ label, count: timeline.values[index] }));
  const total = timeline.values.reduce((acc, value) => acc + value, 0);
  const peak = timeline.values.reduce((acc, value, index) =>
    (value > acc.value ? { value, label: timeline.labels[index] } : acc),
  { value: -1, label: '' });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#86868b]">
        <span>합계 <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{total.toLocaleString()}</span></span>
        {peak.value > 0 && (
          <span>최고치 <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{peak.value.toLocaleString()}</span> · {peak.label}</span>
        )}
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="visits-area-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.7 }}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor', fillOpacity: 0.7 }}
              tickLine={false}
              axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
              allowDecimals={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.3)',
                fontSize: 12,
              }}
              formatter={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                return [`${numericValue.toLocaleString()}회`, '방문'];
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#visits-area-fill)"
              dot={{ r: 3, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
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
    <div
      className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] dark:bg-[#000] dark:text-[#f5f5f7]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", system-ui, sans-serif' }}
    >
      <header className="px-6 pt-12 pb-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {share?.label || t('share.public.title')}
          </h1>
          {share && (
            <p className="mt-3 text-sm text-[#86868b]">
              {formatDateTime(share.snapshotAt)} 기준
              {share.expiresAt && <span className="ml-2">· {formatDateTime(share.expiresAt)} 까지</span>}
            </p>
          )}
        </div>
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
              <Metric label={t('share.public.metric.total')} value={metrics.total.toLocaleString()} icon={faEye} tone="blue" />
              <Metric label={t('share.public.metric.nonBots')} value={metrics.nonBots.toLocaleString()} icon={faRobot} tone="green" />
              <Metric label={t('share.public.metric.uniqueDays')} value={metrics.uniqueDays.toLocaleString()} icon={faGlobe} tone="purple" />
            </div>

            <nav className="inline-flex items-center gap-1 rounded-full bg-[#f2f2f7] p-1 dark:bg-[#1c1c1e]">
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
              <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t('share.public.section.byTime')}
                </h2>
                <TimelineChart visits={visits} emptyLabel={t('share.public.byTime.empty')} />
              </section>
            )}

            {activeSection === 'byContext' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                  <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {t('share.public.byContext.referer')}
                  </h2>
                  <HorizontalBars buckets={refererBuckets} emptyLabel={t('share.public.empty')} tone="purple" />
                </section>
                <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                  <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {t('share.public.byContext.os')}
                  </h2>
                  <HorizontalBars buckets={osBuckets} emptyLabel={t('share.public.empty')} tone="green" />
                </section>
                <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                  <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {t('share.public.byContext.browser')}
                  </h2>
                  <HorizontalBars buckets={browserBuckets} emptyLabel={t('share.public.empty')} />
                </section>
              </div>
            )}

            {activeSection === 'byLocation' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                  <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {t('share.public.byLocation.country')}
                  </h2>
                  <HorizontalBars buckets={countryBuckets} emptyLabel={t('share.public.empty')} tone="green" />
                </section>
                <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                  <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {t('share.public.byLocation.city')}
                  </h2>
                  <HorizontalBars buckets={cityBuckets} emptyLabel={t('share.public.empty')} tone="purple" />
                </section>
              </div>
            )}

            {activeSection === 'list' && (
              <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] dark:bg-[#1c1c1e] dark:shadow-none">
                <h2 className="mb-4 text-base font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
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

      {/* Apple-style minimal footer with no brand text */}
      <div className="h-12" />
    </div>
  );
};
