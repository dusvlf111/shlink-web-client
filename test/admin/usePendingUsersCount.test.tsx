import { renderHook, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { usePendingUsersCount } from '../../src/admin/usePendingUsersCount';
import { AuthProvider } from '../../src/auth/AuthContext';
import { I18nProvider } from '../../src/i18n';
import { pb } from '../../src/lib/pocketbase';
import { setUpStore } from '../../src/store';

const mockGetList = vi.fn();

vi.mock('../../src/lib/pocketbase', () => ({
  pb: {
    authStore: { isValid: true, record: null, onChange: vi.fn(() => () => {}) },
    collection: () => ({ getList: mockGetList }),
  },
  getCurrentUser: () => null,
  isAdmin: () => false,
  isAuthenticated: () => false,
}));

const renderWithProviders = (role: 'admin' | 'member' | null) => {
  // @ts-expect-error mock authStore
  pb.authStore.record = role ? { id: 'u', email: 'u@t', name: 'u', role, status: 'active' } : null;

  const store = setUpStore({});
  const Wrapper: FC<PropsWithChildren> = ({ children }) => (
    <Provider store={store}>
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </Provider>
  );
  return renderHook(() => usePendingUsersCount(), { wrapper: Wrapper });
};

describe('usePendingUsersCount', () => {
  beforeEach(() => {
    mockGetList.mockReset();
  });

  it('returns 0 and skips fetching when the user is not an admin', async () => {
    mockGetList.mockResolvedValue({ totalItems: 9 });
    const { result } = renderWithProviders('member');

    await waitFor(() => expect(result.current.count).toBe(0));
    expect(mockGetList).not.toHaveBeenCalled();
  });

  it('returns 0 when there is no logged-in user', async () => {
    mockGetList.mockResolvedValue({ totalItems: 9 });
    const { result } = renderWithProviders(null);

    await waitFor(() => expect(result.current.count).toBe(0));
    expect(mockGetList).not.toHaveBeenCalled();
  });

  it('returns the totalItems reported by PocketBase for admins', async () => {
    mockGetList.mockResolvedValue({ totalItems: 7 });
    const { result } = renderWithProviders('admin');

    await waitFor(() => expect(result.current.count).toBe(7));
    expect(mockGetList).toHaveBeenCalledWith(1, 1, expect.objectContaining({
      filter: 'status = "pending"',
      fields: 'id',
    }));
  });

  it('falls back to 0 when the PocketBase request fails', async () => {
    mockGetList.mockRejectedValue(new Error('boom'));
    const { result } = renderWithProviders('admin');

    await waitFor(() => expect(mockGetList).toHaveBeenCalled());
    expect(result.current.count).toBe(0);
  });
});
