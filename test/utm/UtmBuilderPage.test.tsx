import { screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import type * as ReactRouter from 'react-router';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UtmTag } from '../../src/utm/useUtmData';
import { UtmBuilderPage } from '../../src/utm/UtmBuilderPage';
import { renderWithStore } from '../__helpers__/setUpTest';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  useNavigate: () => navigateMock,
}));

const saveTemplateMock = vi.fn(async () => undefined);
const deleteTemplateMock = vi.fn(async () => undefined);
const addTagMock = vi.fn(async () => undefined);
const addMissingTagsMock = vi.fn(async () => undefined);
const deleteTagMock = vi.fn(async () => undefined);
let mockTags: UtmTag[] = [
  {
    id: 'tag-1',
    category: 'source',
    value: 'google',
    description: '검색 유입',
  },
  { id: 'tag-2', category: 'medium', value: 'cpc', description: '유료 클릭' },
];

vi.mock('../../src/utm/useUtmData', () => ({
  UTM_CATEGORIES: ['source', 'medium', 'campaign', 'term', 'content'],
  useUtmTags: () => ({
    tags: mockTags,
    addTag: addTagMock,
    addMissingTags: addMissingTagsMock,
    deleteTag: deleteTagMock,
  }),
  useUtmTemplates: () => ({
    templates: [
      {
        id: 'tpl-1',
        name: '기본 템플릿',
        description: '광고 기본 설명',
        source: 'google',
        medium: 'cpc',
        campaign: 'spring',
        term: 'keyword',
        content: 'banner',
      },
    ],
    saveTemplate: saveTemplateMock,
    deleteTemplate: deleteTemplateMock,
  }),
}));

describe('<UtmBuilderPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTags = [
      {
        id: 'tag-1',
        category: 'source',
        value: 'google',
        description: '검색 유입',
      },
      {
        id: 'tag-2',
        category: 'medium',
        value: 'cpc',
        description: '유료 클릭',
      },
    ];
  });

  const setUp = (options: Parameters<typeof renderWithStore>[1] = {}) =>
    renderWithStore(
      <MemoryRouter initialEntries={['/server/server-1/utm-builder']}>
        <Routes>
          <Route
            path="/server/:serverId/utm-builder"
            element={<UtmBuilderPage />}
          />
        </Routes>
      </MemoryRouter>,
      options,
    );

  // Regression (PRD-0602 follow-up): when the page renders without the :serverId
  // route param (e.g. via the web-component's createNotFound) the server must be
  // read from the URL pathname, NOT the autoConnect/first server — otherwise short
  // URLs are created on the wrong Shlink server.
  it('targets the URL server, not the autoConnect server, for short-url creation', async () => {
    const { user } = renderWithStore(
      <MemoryRouter initialEntries={['/server/bin01/utm-builder']}>
        <Routes>
          <Route path="*" element={<UtmBuilderPage />} />
        </Routes>
      </MemoryRouter>,
      {
        initialState: {
          servers: {
            bin01: fromPartial({ id: 'bin01', name: 'Bin01' }),
            other: fromPartial({
              id: 'other',
              name: 'Other',
              autoConnect: true,
            }),
          },
        },
      },
    );

    await user.type(screen.getByLabelText('기본 URL *'), 'https://example.com');
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');
    await user.click(screen.getByRole('button', { name: /^단축링크 만들기$/ }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        expect.stringContaining('/server/bin01/create-short-url'),
      ),
    );
  });

  it('fills utm fields when base URL already has utm params', async () => {
    const { user } = setUp();

    await user.type(
      screen.getByLabelText('기본 URL *'),
      'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_term=dev&utm_content=hero',
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/utm_source/i)).toHaveValue('google');
      expect(screen.getByLabelText(/utm_medium/i)).toHaveValue('cpc');
      expect(screen.getByLabelText(/utm_campaign/i)).toHaveValue('spring');
      expect(screen.getByLabelText(/utm_term/i)).toHaveValue('dev');
      expect(screen.getByLabelText(/utm_content/i)).toHaveValue('hero');
    });
  });

  it('applies template to UTM fields on template button click', async () => {
    const { user } = setUp();

    await user.type(
      screen.getByLabelText('기본 URL *'),
      'https://example.com/page',
    );

    await user.click(screen.getByRole('button', { name: /기본 템플릿/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/utm_source/i)).toHaveValue('google');
      expect(screen.getByLabelText(/utm_medium/i)).toHaveValue('cpc');
      expect(screen.getByLabelText(/utm_campaign/i)).toHaveValue('spring');
      expect(screen.getByLabelText(/utm_term/i)).toHaveValue('keyword');
      expect(screen.getByLabelText(/utm_content/i)).toHaveValue('banner');
    });
  });

  it('generates UTM URL when required fields are filled', async () => {
    const { user } = setUp();

    await user.type(
      screen.getByLabelText('기본 URL *'),
      'https://example.com/page',
    );

    await user.type(screen.getByLabelText(/utm_source/i), 'google');

    await user.type(screen.getByLabelText(/utm_medium/i), 'organic');

    await user.type(screen.getByLabelText(/utm_campaign/i), 'test');

    await waitFor(() => {
      const urlDisplay = screen.getByText(
        /https:\/\/example\.com\/page\?utm_source=google/,
      );
      expect(urlDisplay).toBeInTheDocument();
    });
  });

  it('renders the heading using the i18n key', () => {
    setUp();
    expect(
      screen.getByRole('heading', { name: 'UTM 빌더' }),
    ).toBeInTheDocument();
  });

  it('renders the role-distinction subtitle', () => {
    setUp();
    expect(
      screen.getByText('여러 링크에 같은 UTM 한 벌을 붙여 한 번에 생성'),
    ).toBeInTheDocument();
  });

  it('defaults to single-link mode with the existing input (regression)', () => {
    setUp();
    // Existing single input must still be present and labelled the same.
    expect(screen.getByLabelText('기본 URL *')).toBeInTheDocument();
    // Multi textarea must not be present in the default mode.
    expect(
      screen.queryByLabelText('기본 URL (여러 개는 줄바꿈으로 구분) *'),
    ).not.toBeInTheDocument();
  });

  it('switches to multi-link mode showing a single row by default', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));

    // The single-mode base URL input is gone, replaced by row-based inputs.
    expect(screen.queryByLabelText('기본 URL *')).not.toBeInTheDocument();
    // Exactly one URL row to start, and its remove button is hidden.
    expect(
      screen.getAllByPlaceholderText('https://example.com/page'),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: '행 삭제' }),
    ).not.toBeInTheDocument();
    // The add-link button is present.
    expect(
      screen.getByRole('button', { name: '+ 링크 추가' }),
    ).toBeInTheDocument();
  });

  it('adds rows and removes them, keeping at least one row', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));

    // Two rows now -> remove buttons visible.
    expect(
      screen.getAllByPlaceholderText('https://example.com/page'),
    ).toHaveLength(2);
    const removeButtons = screen.getAllByRole('button', { name: '행 삭제' });
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]);

    // Back to one row, remove button hidden again.
    expect(
      screen.getAllByPlaceholderText('https://example.com/page'),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: '행 삭제' }),
    ).not.toBeInTheDocument();
  });

  it('builds valid URLs and marks invalid ones as skipped in multi mode', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    // Need three rows: valid / invalid / valid.
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));

    const urlInputs = screen.getAllByPlaceholderText(
      'https://example.com/page',
    );
    await user.type(urlInputs[0], 'https://a.com/p');
    await user.type(urlInputs[1], 'not-a-url');
    await user.type(urlInputs[2], 'https://b.com/q');
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await waitFor(() => {
      expect(
        screen.getByText(/https:\/\/a\.com\/p\?utm_source=google/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/https:\/\/b\.com\/q\?utm_source=google/),
      ).toBeInTheDocument();
      // Invalid row is shown as skipped, not built.
      expect(screen.getByText(/건너뜀 \(URL 형식 오류\)/)).toBeInTheDocument();
    });
  });

  it('copies all built URLs at once in multi mode', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));

    const urlInputs = screen.getAllByPlaceholderText(
      'https://example.com/page',
    );
    await user.type(urlInputs[0], 'https://a.com/p');
    await user.type(urlInputs[1], 'https://b.com/q');
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await user.click(screen.getByRole('button', { name: /전체 복사/ }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copied = writeText.mock.calls[0][0] as unknown as string;
    expect(copied.split('\n')).toHaveLength(2);
  });

  it('creates short URLs in bulk for every valid URL', async () => {
    const createShortUrl = vi.fn(async ({ longUrl }: { longUrl: string }) => ({
      shortUrl: `${longUrl}#short`,
      shortCode: 'abc',
    }));
    const buildShlinkApiClient = vi.fn(() => ({ createShortUrl }) as any);

    const { user } = setUp({
      buildShlinkApiClient,
      initialState: {
        servers: {
          'server-1': {
            id: 'server-1',
            name: 'S',
            url: 'https://s',
            apiKey: 'k',
          },
        } as any,
      },
    });

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));

    const urlInputs = screen.getAllByPlaceholderText(
      'https://example.com/page',
    );
    await user.type(urlInputs[0], 'https://a.com/p');
    await user.type(urlInputs[1], 'https://b.com/q');
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await user.click(
      screen.getByRole('button', { name: /한번에 링크 만들기/ }),
    );

    await user.click(
      screen.getByRole('button', { name: '한번에 단축링크 만들기' }),
    );

    await waitFor(
      () => {
        expect(createShortUrl).toHaveBeenCalledTimes(2);
      },
      { timeout: 5000 },
    );
  });

  it('passes per-row title and tags to createShortUrl in multi mode', async () => {
    const createShortUrl = vi.fn(async ({ longUrl }: { longUrl: string }) => ({
      shortUrl: `${longUrl}#short`,
      shortCode: 'abc',
    }));
    const buildShlinkApiClient = vi.fn(() => ({ createShortUrl }) as any);

    const { user } = setUp({
      buildShlinkApiClient,
      initialState: {
        servers: {
          'server-1': {
            id: 'server-1',
            name: 'S',
            url: 'https://s',
            apiKey: 'k',
          },
        } as any,
      },
    });

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    await user.click(screen.getByRole('button', { name: '+ 링크 추가' }));

    const urlInputs = screen.getAllByPlaceholderText(
      'https://example.com/page',
    );
    const titleInputs = screen.getAllByPlaceholderText('제목 (선택)');
    const tagInputs = screen.getAllByPlaceholderText('태그 (선택, 쉼표 구분)');

    await user.type(urlInputs[0], 'https://a.com/p');
    await user.type(titleInputs[0], '첫번째');
    await user.type(tagInputs[0], 'alpha, beta');

    await user.type(urlInputs[1], 'https://b.com/q');
    await user.type(titleInputs[1], '두번째');
    await user.type(tagInputs[1], 'gamma');

    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await user.click(
      screen.getByRole('button', { name: /한번에 링크 만들기/ }),
    );
    await user.click(
      screen.getByRole('button', { name: '한번에 단축링크 만들기' }),
    );

    await waitFor(
      () => {
        expect(createShortUrl).toHaveBeenCalledTimes(2);
      },
      { timeout: 5000 },
    );

    expect(createShortUrl).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        longUrl: expect.stringContaining('https://a.com/p'),
        title: '첫번째',
        tags: ['alpha', 'beta'],
      }),
    );
    expect(createShortUrl).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        longUrl: expect.stringContaining('https://b.com/q'),
        title: '두번째',
        tags: ['gamma'],
      }),
    );
  });
});
