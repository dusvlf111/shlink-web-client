import { screen, waitFor } from '@testing-library/react';
import { UserManagementPage } from '../../src/admin/UserManagementPage';
import { renderWithEvents } from '../__helpers__/setUpTest';

const useAuthMock = vi.fn();
const usersCollectionMock = {
  getFullList: vi.fn(),
  update: vi.fn(),
};

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');

  return {
    ...actual,
    useAuth: () => useAuthMock(),
  };
});

vi.mock('../../src/lib/pocketbase', () => ({
  pb: {
    collection: () => usersCollectionMock,
  },
}));

describe('<UserManagementPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 'admin-1', role: 'admin' },
    });
  });

  it('falls back to unfiltered list when status filter request fails with 400', async () => {
    usersCollectionMock.getFullList
      .mockRejectedValueOnce({ status: 400, message: 'invalid filter' })
      .mockResolvedValueOnce([
        { id: 'u-1', email: 'pending@example.com', name: 'Pending', role: 'member', status: 'pending' },
        { id: 'u-2', email: 'active@example.com', name: 'Active', role: 'member', status: 'active' },
      ]);

    renderWithEvents(<UserManagementPage />);

    await waitFor(() => expect(screen.getByText('Pending')).toBeInTheDocument());
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(usersCollectionMock.getFullList).toHaveBeenNthCalledWith(1, { filter: 'status = "pending"', sort: 'created' });
    expect(usersCollectionMock.getFullList).toHaveBeenNthCalledWith(2, { sort: 'created' });
  });

  it('updates user status from pending tab actions', async () => {
    usersCollectionMock.getFullList
      .mockResolvedValueOnce([
        { id: 'u-1', email: 'pending@example.com', name: 'Pending', role: 'member', status: 'pending' },
      ])
      .mockResolvedValueOnce([]);

    usersCollectionMock.update.mockResolvedValueOnce(undefined);

    const { user } = renderWithEvents(<UserManagementPage />);

    await waitFor(() => expect(screen.getByText('Pending')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '승인' }));

    await waitFor(() => {
      expect(usersCollectionMock.update).toHaveBeenCalledWith('u-1', { status: 'active' });
    });
  });

  it('shows no-access message for non-admin users', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'member-1', role: 'member' } });
    usersCollectionMock.getFullList.mockResolvedValueOnce([]);

    renderWithEvents(<UserManagementPage />);

    expect(screen.getByText('접근 권한이 없습니다.')).toBeInTheDocument();

    await waitFor(() => {
      expect(usersCollectionMock.getFullList).toHaveBeenCalled();
    });
  });
});
