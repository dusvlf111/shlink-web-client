import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { pb, type UserRecord } from '../lib/pocketbase';

type TabKey = 'pending' | 'active' | 'inactive';

const STATUS_LABEL: Record<TabKey, string> = {
  pending: '승인 대기',
  active: '활성',
  inactive: '비활성',
};

const ROLE_LABEL: Record<string, string> = {
  admin: '어드민',
  member: '멤버',
};

const isBadFilterRequest = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as { status?: number; message?: string; response?: { message?: string } };
  const message = (maybeError.response?.message ?? maybeError.message ?? '').toLowerCase();

  return maybeError.status === 400 && (message.includes('filter') || message.includes('status'));
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { status?: number; message?: string; response?: { message?: string } };
    if (maybeError.status === 403) {
      return '권한이 없어 사용자 목록을 조회할 수 없습니다. PocketBase users 컬렉션 listRule을 확인하세요.';
    }

    return maybeError.response?.message ?? maybeError.message ?? fallback;
  }

  return fallback;
};

export const UserManagementPage: FC = () => {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<TabKey>('pending');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const records = await pb.collection('users').getFullList<UserRecord>({
        filter: `status = "${tab}"`,
      });
      setUsers(records);
    } catch (error: unknown) {
      if (isBadFilterRequest(error)) {
        try {
          const allUsers = await pb.collection('users').getFullList<UserRecord>();
          setUsers(allUsers.filter((user) => user.status === tab));
          return;
        } catch (fallbackError: unknown) {
          setError(getErrorMessage(fallbackError, '사용자 목록을 불러오는 데 실패했습니다.'));
          return;
        }
      }

      setError(getErrorMessage(error, '사용자 목록을 불러오는 데 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const update = async (id: string, data: Partial<UserRecord>) => {
    setActionLoading(id);
    try {
      await pb.collection('users').update(id, data);
      await fetchUsers();
    } catch (error: unknown) {
      setError(getErrorMessage(error, '업데이트에 실패했습니다.'));
    } finally {
      setActionLoading(null);
    }
  };

  if (me?.role !== 'admin') {
    return <div className="p-8 text-center text-gray-500">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="w-full md:pl-(--aside-menu-width)">
      <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>

      {/* 탭 */}
      <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
        {(['pending', 'active', 'inactive'] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-gray-400">해당 사용자가 없습니다.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">이름</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">권한</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{u.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.id !== me?.id ? (
                      <select
                        value={u.role}
                        disabled={actionLoading === u.id}
                        onChange={(e) => update(u.id, { role: e.target.value as 'admin' | 'member' })}
                        className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="member">멤버</option>
                        <option value="admin">어드민</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500">{ROLE_LABEL[u.role]} (나)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {tab === 'pending' && (
                        <>
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => update(u.id, { status: 'active' })}
                            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => update(u.id, { status: 'inactive' })}
                            className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </>
                      )}
                      {tab === 'active' && u.id !== me?.id && (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => update(u.id, { status: 'inactive' })}
                          className="rounded bg-gray-500 px-3 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50"
                        >
                          비활성화
                        </button>
                      )}
                      {tab === 'inactive' && (
                        <button
                          disabled={actionLoading === u.id}
                          onClick={() => update(u.id, { status: 'active' })}
                          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          재활성화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};
