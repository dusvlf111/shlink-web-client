import { screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PublicShareStatsPage } from '../../src/share/PublicShareStatsPage';
import {
  fetchPublicShareToken,
  isShareTokenExpired,
  type ShareToken,
} from '../../src/share/services/shareTokenService';
import { renderWithStore } from '../__helpers__/setUpTest';

vi.mock('../../src/share/services/shareTokenService', async () => {
  const actual = await vi.importActual<typeof import('../../src/share/services/shareTokenService')>(
    '../../src/share/services/shareTokenService',
  );

  return {
    ...actual,
    fetchPublicShareToken: vi.fn(),
    isShareTokenExpired: vi.fn(),
  };
});

describe('<PublicShareStatsPage />', () => {
  const mockFetchPublicShareToken = vi.mocked(fetchPublicShareToken);
  const mockIsShareTokenExpired = vi.mocked(isShareTokenExpired);

  const setUp = (entry: string) => renderWithStore(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/share/stats/:tokenId" element={<PublicShareStatsPage />} />
      </Routes>
    </MemoryRouter>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsShareTokenExpired.mockReturnValue(false);
  });

  it('shows invalid-link message and skips API call for malformed params', async () => {
    setUp('/share/stats/bad-id?token=bad-token');

    await waitFor(() => {
      expect(screen.getByText('공유 링크 형식이 올바르지 않습니다.')).toBeInTheDocument();
    });
    expect(mockFetchPublicShareToken).not.toHaveBeenCalled();
  });

  it('shows not-found message when API lookup fails', async () => {
    mockFetchPublicShareToken.mockRejectedValueOnce(new Error('not found'));

    setUp('/share/stats/abc123def456ghi?token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd');

    await waitFor(() => {
      expect(screen.getByText('공유 링크를 찾을 수 없거나 토큰이 올바르지 않습니다.')).toBeInTheDocument();
    });
  });

  it('shows expired message when the token is expired', async () => {
    const token = fromPartial<ShareToken>({
      id: 'abc123def456ghi',
      token: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      shortCode: '4ONyC',
      snapshotAt: new Date().toISOString(),
    });
    mockFetchPublicShareToken.mockResolvedValueOnce(token);
    mockIsShareTokenExpired.mockReturnValueOnce(true);

    setUp('/share/stats/abc123def456ghi?token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd');

    await waitFor(() => {
      expect(screen.getByText('이 공유 링크는 만료되었습니다.')).toBeInTheDocument();
    });
  });
});
