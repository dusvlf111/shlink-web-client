import { faCopy, faRotateRight, faShareNodes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import type { ShlinkApiClientBuilder } from '../api/services/ShlinkApiClientBuilder';
import { useAuth } from '../auth/AuthContext';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useT } from '../i18n';
import { useServers } from '../servers/reducers/servers';
import {
  buildShareUrl,
  createShareToken,
  deleteShareToken,
  isShareTokenExpired,
  listShareTokens,
  refreshShareToken,
  type ShareToken,
} from './services/shareTokenService';
import { ShortUrlPicker } from './ShortUrlPicker';

const EXPIRY_OPTIONS = [
  { days: 1, labelKey: 'share.manager.create.expiry.day1' },
  { days: 7, labelKey: 'share.manager.create.expiry.day7' },
  { days: 30, labelKey: 'share.manager.create.expiry.day30' },
  { days: 90, labelKey: 'share.manager.create.expiry.day90' },
  { days: 0, labelKey: 'share.manager.create.expiry.never' },
] as const;

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

type ShareStatsManagerPageProps = {
  buildShlinkApiClient: ShlinkApiClientBuilder;
};

type Notice = {
  kind: 'success' | 'error';
  message: string;
};

const ShareStatsManagerPageBase: FC<ShareStatsManagerPageProps> = ({ buildShlinkApiClient }) => {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { serverId: paramServerId } = useParams<{ serverId: string }>();
  const { servers } = useServers();
  const fallbackServerId = useMemo(() => {
    const list = Object.values(servers);
    return list.find((server) => server.autoConnect)?.id ?? list[0]?.id ?? null;
  }, [servers]);
  const activeServerId = paramServerId ?? fallbackServerId ?? null;
  const activeServer = activeServerId ? servers[activeServerId] : null;

  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [shortCode, setShortCode] = useState('');
  const [label, setLabel] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lastIssuedUrl, setLastIssuedUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const apiClientForPicker = useMemo(
    () => (activeServer ? buildShlinkApiClient(activeServer) : null),
    [activeServer, buildShlinkApiClient],
  );

  const reload = useCallback(async (): Promise<ShareToken[] | null> => {
    try {
      const list = await listShareTokens();
      setTokens(list);
      return list;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void reload();
    }
  }, [isAdmin, reload]);

  const handleCreate = async () => {
    setNotice(null);
    if (!isAdmin) {
      setNotice({ kind: 'error', message: t('share.manager.create.adminOnly') });
      return;
    }
    if (!activeServer) {
      setNotice({ kind: 'error', message: t('share.manager.create.serverMissing') });
      return;
    }
    if (!shortCode.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const apiClient = buildShlinkApiClient(activeServer);
      const createdToken = await createShareToken({
        shortCode: shortCode.trim(),
        serverId: activeServer.id,
        label: label.trim() || undefined,
        expiresInDays: expiryDays > 0 ? expiryDays : undefined,
        apiClient,
      });
      const createdShareUrl = buildShareUrl(window.location.origin, createdToken.id, createdToken.token);
      setLastIssuedUrl(createdShareUrl);
      setTokens((prev) => [createdToken, ...prev.filter((token) => token.id !== createdToken.id)]);
      setShortCode('');
      setLabel('');
      setNotice({ kind: 'success', message: t('share.manager.notice.createSuccess') });
      void reload();
    } catch {
      setNotice({ kind: 'error', message: t('share.manager.notice.createError') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (token: ShareToken) => {
    const url = buildShareUrl(window.location.origin, token.id, token.token);
    await navigator.clipboard.writeText(url);
    setCopiedId(token.id);
    setTimeout(() => setCopiedId((current) => (current === token.id ? null : current)), 2000);
  };

  const handleRefresh = async (token: ShareToken) => {
    if (!activeServer) {
      setNotice({ kind: 'error', message: t('share.manager.create.serverMissing') });
      return;
    }
    setRefreshingId(token.id);
    setNotice(null);
    try {
      const apiClient = buildShlinkApiClient(activeServer);
      await refreshShareToken(token.id, token.shortCode, apiClient);
      await reload();
    } catch {
      setNotice({ kind: 'error', message: t('share.manager.notice.refreshError') });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (token: ShareToken) => {
    if (!window.confirm(t('share.manager.row.deleteConfirm'))) {
      return;
    }
    setNotice(null);
    try {
      await deleteShareToken(token.id);
      await reload();
    } catch {
      setNotice({ kind: 'error', message: t('share.manager.notice.deleteError') });
    }
  };

  return (
    <NoMenuLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-(--light-text-color) dark:text-(--dark-text-color)">
            <FontAwesomeIcon icon={faShareNodes} /> {t('share.manager.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('share.manager.subtitle')}</p>
        </header>

        {!isAdmin && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            {t('share.manager.create.adminOnly')}
          </div>
        )}

        {isAdmin && (
          <section className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              {t('share.manager.create.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="share-short-code" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('share.manager.create.shortCode.label')}
                </label>
                <ShortUrlPicker
                  inputId="share-short-code"
                  apiClient={apiClientForPicker}
                  selectedShortCode={shortCode}
                  onSelect={({ shortCode: code, title }) => {
                    setShortCode(code);
                    if (!label.trim() && title) {
                      setLabel(title);
                    }
                  }}
                  onClear={() => setShortCode('')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('share.manager.create.shortCode.help')}</p>
              </div>
              <div>
                <label htmlFor="share-label" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('share.manager.create.label.label')}
                </label>
                <input
                  id="share-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t('share.manager.create.label.placeholder')}
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="share-expiry" className="mb-1 block text-xs font-medium text-(--light-text-color) dark:text-(--dark-text-color)">
                  {t('share.manager.create.expiry.label')}
                </label>
                <select
                  id="share-expiry"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full rounded border border-lm-border px-3 py-2 text-sm focus:border-lm-main focus:outline-none dark:border-dm-border dark:bg-dm-main dark:text-(--dark-text-color)"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.days} value={option.days}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {notice ? (
              <p className={`mt-3 text-xs ${notice.kind === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {notice.message}
              </p>
            ) : null}

            {lastIssuedUrl ? (
              <p className="mt-2 break-all rounded bg-lm-primary/40 px-2 py-1 text-[11px] text-(--light-text-color) dark:bg-dm-main dark:text-(--dark-text-color)">
                {t('share.manager.create.issuedUrl')}: {lastIssuedUrl}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={submitting || !shortCode.trim()}
                onClick={() => void handleCreate()}
                className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40"
              >
                {submitting ? t('share.manager.create.submitting') : t('share.manager.create.submit')}
              </button>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="rounded-md border border-lm-border bg-white p-4 dark:border-dm-border dark:bg-dm-primary">
            <h2 className="mb-3 text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
              {t('share.manager.list.title')}
            </h2>
            {tokens.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('share.manager.list.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {tokens.map((token) => {
                  const expired = isShareTokenExpired(token);
                  const shareUrl = buildShareUrl(window.location.origin, token.id, token.token);
                  return (
                    <li
                      key={token.id}
                      className="rounded border border-lm-border p-3 dark:border-dm-border"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-(--light-text-color) dark:text-(--dark-text-color)">
                            {token.label || token.shortCode}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono">{token.shortCode}</span>
                          </p>
                          <p className="mt-1 break-all rounded bg-lm-primary/40 px-2 py-1 text-[11px] text-(--light-text-color) dark:bg-dm-main dark:text-(--dark-text-color)">
                            {shareUrl}
                          </p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {t('share.manager.row.expires')}: {token.expiresAt ? formatDateTime(token.expiresAt) : t('share.manager.row.never')}
                            {expired ? (
                              <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-900 dark:text-red-200">
                                {t('share.manager.row.expired')}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('share.manager.row.snapshotAt')}: {formatDateTime(token.snapshotAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopy(token)}
                            className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-(--light-text-color) hover:bg-gray-200 dark:bg-gray-800 dark:text-(--dark-text-color) dark:hover:bg-gray-700"
                          >
                            <FontAwesomeIcon icon={faCopy} />
                            {copiedId === token.id ? t('share.manager.row.copied') : t('share.manager.row.copy')}
                          </button>
                          <button
                            type="button"
                            disabled={refreshingId === token.id}
                            onClick={() => void handleRefresh(token)}
                            className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            <FontAwesomeIcon icon={faRotateRight} />
                            {refreshingId === token.id ? t('share.manager.row.refreshing') : t('share.manager.row.refresh')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(token)}
                            className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            {t('share.manager.row.delete')}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </NoMenuLayout>
  );
};

export const ShareStatsManagerPage = withDependencies(ShareStatsManagerPageBase, ['buildShlinkApiClient']);
