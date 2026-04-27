import { screen, waitFor } from '@testing-library/react';
import type { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ShareStatsManagerPage } from '../../src/share/ShareStatsManagerPage';
import {
  createShareToken,
  listShareTokens,
  type ShareToken,
} from '../../src/share/services/shareTokenService';
import type { ServerWithId } from '../../src/servers/data';
import { ADMIN_USER, renderWithStore } from '../__helpers__/setUpTest';

vi.mock('../../src/share/ShortUrlPicker', () => ({
  ShortUrlPicker: ({ selectedShortCode, onSelect, onClear }: {
    selectedShortCode: string;
    onSelect: (selection: { shortCode: string; title?: string }) => void;
    onClear: () => void;
  }) => (selectedShortCode
    ? <button type="button" onClick={onClear}>clear selected short code</button>
    : (
      <button
        type="button"
        onClick={() => onSelect({ shortCode: '4ONyC', title: '테스트 링크' })}
      >
        pick short code
      </button>
    )),
}));

vi.mock('../../src/share/services/shareTokenService', async () => {
  const actual = await vi.importActual<typeof import('../../src/share/services/shareTokenService')>(
    '../../src/share/services/shareTokenService',
  );

  return {
    ...actual,
    createShareToken: vi.fn(),
    listShareTokens: vi.fn(),
    refreshShareToken: vi.fn(),
    deleteShareToken: vi.fn(),
  };
});

describe('<ShareStatsManagerPage />', () => {
  const mockCreateShareToken = vi.mocked(createShareToken);
  const mockListShareTokens = vi.mocked(listShareTokens);
  const buildShlinkApiClient = vi.fn(() => fromPartial<ShlinkApiClient>({}));

  const setUp = () => renderWithStore(
    <MemoryRouter initialEntries={['/server/server-1/share-stats']}>
      <Routes>
        <Route path="/server/:serverId/share-stats" element={<ShareStatsManagerPage />} />
      </Routes>
    </MemoryRouter>,
    {
      asUser: ADMIN_USER,
      buildShlinkApiClient,
      initialState: {
        servers: {
          'server-1': fromPartial<ServerWithId>({
            id: 'server-1',
            name: 'Server 1',
            autoConnect: true,
          }),
        },
      },
    },
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows issued URL and keeps the new item visible right after successful creation', async () => {
    const createdToken = fromPartial<ShareToken>({
      id: 'token-1',
      token: 'secret-token',
      shortCode: '4ONyC',
      label: '테스트 링크',
      createdAt: new Date().toISOString(),
    });

    mockListShareTokens.mockResolvedValueOnce([]);
    mockListShareTokens.mockReturnValueOnce(new Promise(() => {
      // Keep the reload request pending to verify optimistic list update.
    }));
    mockCreateShareToken.mockResolvedValueOnce(createdToken);

    const { user } = setUp();
    await user.click(screen.getByRole('button', { name: 'pick short code' }));
    await user.click(screen.getByRole('button', { name: '공유 링크 만들기' }));

    await waitFor(() => {
      expect(screen.getByText('공유 링크가 생성되었습니다.')).toBeInTheDocument();
    });

    expect(screen.getByText(/발급된 링크:/)).toHaveTextContent('/share/stats/token-1?token=secret-token');
    expect(screen.getByText('테스트 링크')).toBeInTheDocument();
  });

  it('shows an i18n error message when creation fails', async () => {
    mockListShareTokens.mockResolvedValueOnce([]);
    mockCreateShareToken.mockRejectedValueOnce(new Error('boom'));

    const { user } = setUp();
    await user.click(screen.getByRole('button', { name: 'pick short code' }));
    await user.click(screen.getByRole('button', { name: '공유 링크 만들기' }));

    await waitFor(() => {
      expect(screen.getByText('공유 링크 생성에 실패했습니다.')).toBeInTheDocument();
    });
  });
});
