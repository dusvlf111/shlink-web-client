import { screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import { HistoryPage } from '../../src/history/HistoryPage';
import type { ShortUrlHistoryRecord } from '../../src/history/shortUrlHistoryService';
import * as ShortUrlHistoryService from '../../src/history/shortUrlHistoryService';
import { renderWithStore } from '../__helpers__/setUpTest';

vi.mock('../../src/history/shortUrlHistoryService', async (importOriginal) => {
  const actual = await importOriginal<typeof ShortUrlHistoryService>();
  return {
    ...actual,
    fetchShortUrlHistory: vi.fn(),
  };
});

const { fetchShortUrlHistory } = ShortUrlHistoryService;

const mockFetch = vi.mocked(fetchShortUrlHistory);

const RECORDS: ShortUrlHistoryRecord[] = [
  fromPartial<ShortUrlHistoryRecord>({
    id: 'rec-1',
    created_by: 'user-1',
    server_id: 'srv-1',
    server_name: 'Bin01',
    short_url: 'https://s.test/aaa',
    short_code: 'aaa',
    long_url: 'https://example.com/page?utm_source=google',
    title: '봄 캠페인',
    tags: ['promo', 'spring'],
    utm_source: 'google',
    utm_medium: 'cpc',
    created: '2026-05-01T10:00:00Z',
    updated: '2026-05-01T10:00:00Z',
    expand: {
      created_by: fromPartial({ name: '홍길동', email: 'hong@test.com' }),
    },
  }),
  fromPartial<ShortUrlHistoryRecord>({
    id: 'rec-2',
    created_by: 'user-2',
    server_id: 'srv-2',
    server_name: 'Bin02',
    short_url: 'https://s.test/bbb',
    short_code: 'bbb',
    long_url: 'https://example.org/other',
    title: '',
    tags: [],
    created: '2026-05-02T12:00:00Z',
    updated: '2026-05-02T12:00:00Z',
    expand: { created_by: fromPartial({ email: 'no-name@test.com' }) },
  }),
];

describe('<HistoryPage />', () => {
  const setUp = () =>
    renderWithStore(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
      {
        initialState: {
          servers: {
            'srv-1': fromPartial({
              id: 'srv-1',
              name: 'Bin01',
              url: 'https://s.test',
              apiKey: 'key',
            }),
            'srv-2': fromPartial({ id: 'srv-2', name: 'Bin02' }),
          },
        },
      },
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders server, short/long URLs, title, creator and created date', async () => {
    mockFetch.mockResolvedValue(RECORDS);
    setUp();

    await waitFor(() => {
      expect(screen.getByText('봄 캠페인')).toBeInTheDocument();
    });

    // "Bin01" appears both as a table cell and a filter <option>, so assert at
    // least one match rather than a single unique one.
    expect(screen.getAllByText('Bin01').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'https://s.test/aaa' }),
    ).toHaveAttribute('href', 'https://s.test/aaa');
    expect(
      screen.getByText('https://example.com/page?utm_source=google'),
    ).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('no-name@test.com')).toBeInTheDocument();
    expect(screen.getByText('promo')).toBeInTheDocument();
    expect(screen.getByText('source=google · medium=cpc')).toBeInTheDocument();
  });

  it('shows the empty state when there are no records', async () => {
    mockFetch.mockResolvedValue([]);
    setUp();

    await waitFor(() => {
      expect(
        screen.getByText('아직 기록된 단축링크가 없습니다.'),
      ).toBeInTheDocument();
    });
  });

  it('does not render a non-http(s) short_url as a clickable link (XSS guard)', async () => {
    mockFetch.mockResolvedValue([
      fromPartial<ShortUrlHistoryRecord>({
        id: 'evil',
        created_by: 'user-1',
        server_id: 'srv-1',
        server_name: 'Bin01',

        short_url: 'javascript:alert(1)',
        long_url: 'javascript:alert(2)',
        created: '2026-05-03T10:00:00Z',
        updated: '2026-05-03T10:00:00Z',
      }),
    ]);
    setUp();

    await waitFor(() => {
      expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    });

    // The dangerous URL is shown as plain text, never as an <a href>.
    expect(
      screen.queryByRole('link', { name: 'javascript:alert(1)' }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'javascript:alert(2)' }),
    ).toBeNull();
  });

  it('renders an http(s) short_url as a clickable link', async () => {
    mockFetch.mockResolvedValue(RECORDS);
    setUp();

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'https://s.test/aaa' }),
      ).toHaveAttribute('href', 'https://s.test/aaa');
    });
  });

  it('re-fetches with a server filter when a server is selected', async () => {
    mockFetch.mockResolvedValue(RECORDS);
    const { user } = setUp();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith({});
    });

    await user.selectOptions(screen.getByLabelText('서버 필터'), 'srv-1');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith({ serverId: 'srv-1' });
    });
  });

  it('renders created/deleted action badges', async () => {
    mockFetch.mockResolvedValue([
      ...RECORDS,
      fromPartial<ShortUrlHistoryRecord>({
        id: 'rec-del',
        created_by: 'user-1',
        server_id: 'srv-1',
        server_name: 'Bin01',
        short_url: 'https://s.test/ddd',
        short_code: 'ddd',
        long_url: 'https://example.com/gone',
        action: 'deleted',
        created: '2026-05-04T10:00:00Z',
        updated: '2026-05-04T10:00:00Z',
      }),
    ]);
    setUp();

    await waitFor(() => {
      expect(screen.getAllByTestId('history-action-created').length).toBe(2);
    });
    expect(screen.getByTestId('history-action-deleted')).toBeInTheDocument();
    expect(screen.getAllByText('생성').length).toBe(2);
  });

  it('is read-only: never renders a delete button (history is archival)', async () => {
    mockFetch.mockResolvedValue(RECORDS);
    setUp();

    await waitFor(() => {
      expect(screen.getByText('봄 캠페인')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: '삭제' }),
    ).not.toBeInTheDocument();
  });
});
