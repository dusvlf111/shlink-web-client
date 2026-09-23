import { screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import { HistoryPage } from '../../src/history/HistoryPage';
import type {
  HistoryListResult,
  ShortUrlHistoryRecord,
} from '../../src/history/shortUrlHistoryService';
import * as ShortUrlHistoryService from '../../src/history/shortUrlHistoryService';
import { renderWithStore } from '../__helpers__/setUpTest';

vi.mock('../../src/history/shortUrlHistoryService', async (importOriginal) => {
  const actual = await importOriginal<typeof ShortUrlHistoryService>();
  return {
    ...actual,
    fetchShortUrlHistoryPage: vi.fn(),
    fetchHistoryFacets: vi.fn(),
  };
});

const { fetchShortUrlHistoryPage, fetchHistoryFacets } = ShortUrlHistoryService;

const mockFetchPage = vi.mocked(fetchShortUrlHistoryPage);
const mockFetchFacets = vi.mocked(fetchHistoryFacets);

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

const page = (
  items: ShortUrlHistoryRecord[],
  overrides: Partial<HistoryListResult> = {},
): HistoryListResult => ({
  items,
  page: 1,
  totalPages: items.length > 0 ? 1 : 0,
  totalItems: items.length,
  ...overrides,
});

const facets = (records: ShortUrlHistoryRecord[]) => {
  const tags = new Set<string>();
  const templates = new Set<string>();
  const servers = new Map<string, string>();
  records.forEach((record) => {
    (record.tags ?? []).forEach((tag) => tags.add(tag));
    if (record.template_name?.trim()) {
      templates.add(record.template_name.trim());
    }
    if (!servers.has(record.server_id)) {
      servers.set(record.server_id, record.server_name || record.server_id);
    }
  });
  return {
    tags: [...tags],
    templates: [...templates],
    servers: Array.from(servers, ([id, name]) => ({ id, name })),
  };
};

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
    mockFetchFacets.mockResolvedValue({ tags: [], templates: [], servers: [] });
  });

  it('renders server, short/long URLs, title, creator and created date', async () => {
    mockFetchPage.mockResolvedValue(page(RECORDS));
    mockFetchFacets.mockResolvedValue(facets(RECORDS));
    const { user } = setUp();

    await waitFor(() => {
      expect(screen.getByText('봄 캠페인')).toBeInTheDocument();
    });

    // "Bin01" appears both as a table cell and a server filter chip, so
    // assert at least one match rather than a single unique one.
    expect(screen.getAllByText('Bin01').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'https://s.test/aaa' }),
    ).toHaveAttribute('href', 'https://s.test/aaa');
    // "promo" appears both as a table cell and a tag filter chip.
    expect(screen.getAllByText('promo').length).toBeGreaterThan(0);

    // The creator isn't a default-visible column; open the row's detail
    // modal to check it's still recorded.
    await user.click(screen.getByText('봄 캠페인'));
    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });
  });

  it('shows the empty state when there are no records', async () => {
    mockFetchPage.mockResolvedValue(page([]));
    setUp();

    await waitFor(() => {
      expect(
        screen.getByText('아직 기록된 단축링크가 없습니다.'),
      ).toBeInTheDocument();
    });
  });

  it('does not render a non-http(s) short_url as a clickable link (XSS guard)', async () => {
    const evil = [
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
    ];
    mockFetchPage.mockResolvedValue(page(evil));
    setUp();

    await waitFor(() => {
      expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    });

    // The dangerous URL is shown as plain text, never as an <a href>.
    expect(
      screen.queryByRole('link', { name: 'javascript:alert(1)' }),
    ).toBeNull();
  });

  it('renders an http(s) short_url as a clickable link', async () => {
    mockFetchPage.mockResolvedValue(page(RECORDS));
    setUp();

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'https://s.test/aaa' }),
      ).toHaveAttribute('href', 'https://s.test/aaa');
    });
  });

  it('re-fetches with a server filter when a server chip is selected', async () => {
    mockFetchPage.mockResolvedValue(page(RECORDS));
    mockFetchFacets.mockResolvedValue(facets(RECORDS));
    const { user } = setUp();

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledWith(
        1,
        30,
        expect.objectContaining({ serverId: undefined }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Bin01' }));

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledWith(
        1,
        30,
        expect.objectContaining({ serverId: 'srv-1' }),
      );
    });
  });

  it('keeps the tag and template filters collapsed until their dropdown is opened', async () => {
    mockFetchPage.mockResolvedValue(page(RECORDS));
    mockFetchFacets.mockResolvedValue(facets(RECORDS));
    const { user } = setUp();

    await waitFor(() => {
      expect(screen.getByText('태그 필터')).toBeInTheDocument();
    });

    // Collapsed by default: the <details> disclosure has no `open` attribute,
    // so the CSS that hides its content (`hidden group-open:flex`, not
    // exercised by this CSS-less component test) applies.
    const details = screen.getByText('태그 필터').closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');

    await user.click(screen.getByText('태그 필터'));

    await waitFor(() => {
      expect(details).toHaveAttribute('open');
    });

    await user.click(screen.getByRole('button', { name: 'spring' }));

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledWith(
        1,
        30,
        expect.objectContaining({ tags: ['spring'] }),
      );
    });
  });

  it('loads the next page once the list is scrolled to the bottom', async () => {
    mockFetchPage.mockResolvedValueOnce(
      page(RECORDS, { totalPages: 2, totalItems: 3 }),
    );
    setUp();

    await waitFor(() => {
      expect(screen.getByText('봄 캠페인')).toBeInTheDocument();
    });

    const nextRecord = fromPartial<ShortUrlHistoryRecord>({
      id: 'rec-3',
      created_by: 'user-1',
      server_id: 'srv-1',
      server_name: 'Bin01',
      short_url: 'https://s.test/ccc',
      long_url: 'https://example.com/third',
      title: '세 번째',
      tags: [],
      created: '2026-05-05T10:00:00Z',
      updated: '2026-05-05T10:00:00Z',
    });
    mockFetchPage.mockResolvedValueOnce(
      page([nextRecord], { page: 2, totalPages: 2, totalItems: 3 }),
    );

    await waitFor(
      () => {
        expect(mockFetchPage).toHaveBeenCalledWith(2, 30, expect.anything());
      },
      { timeout: 5000 },
    );

    await waitFor(() => {
      expect(screen.getByText('세 번째')).toBeInTheDocument();
    });
  });

  it('renders created/deleted action badges', async () => {
    mockFetchPage.mockResolvedValue(
      page([
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
      ]),
    );
    setUp();

    await waitFor(() => {
      expect(screen.getAllByTestId('history-row-created').length).toBe(2);
    });
    expect(screen.getByTestId('history-row-deleted')).toBeInTheDocument();
  });

  it('is read-only: never renders a delete button (history is archival)', async () => {
    mockFetchPage.mockResolvedValue(page(RECORDS));
    setUp();

    await waitFor(() => {
      expect(screen.getByText('봄 캠페인')).toBeInTheDocument();
    });

    // "삭제" also labels the (non-destructive) action filter chip, so assert
    // there is exactly one "삭제" button and that it's that filter chip
    // (identifiable by its aria-pressed toggle state), not a delete action.
    const deleteLabeled = screen.getAllByRole('button', { name: '삭제' });
    expect(deleteLabeled).toHaveLength(1);
    expect(deleteLabeled[0]).toHaveAttribute('aria-pressed');
  });
});
