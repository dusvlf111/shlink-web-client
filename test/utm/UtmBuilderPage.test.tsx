import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UtmTag } from '../../src/utm/useUtmData';
import { UtmBuilderPage } from '../../src/utm/UtmBuilderPage';
import { renderWithStore } from '../__helpers__/setUpTest';

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

  it('switches to multi-link mode showing a textarea', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));

    expect(
      screen.getByLabelText('기본 URL (여러 개는 줄바꿈으로 구분) *'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('기본 URL *')).not.toBeInTheDocument();
  });

  it('builds valid URLs and marks invalid ones as skipped in multi mode', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));

    await user.type(
      screen.getByLabelText('기본 URL (여러 개는 줄바꿈으로 구분) *'),
      'https://a.com/p{enter}not-a-url{enter}https://b.com/q',
    );
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await waitFor(() => {
      expect(
        screen.getByText(/https:\/\/a\.com\/p\?utm_source=google/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/https:\/\/b\.com\/q\?utm_source=google/),
      ).toBeInTheDocument();
      // Invalid line is shown as skipped, not built.
      expect(screen.getByText(/건너뜀 \(URL 형식 오류\)/)).toBeInTheDocument();
    });
  });

  it('copies all built URLs at once in multi mode', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '다중 링크' }));
    await user.type(
      screen.getByLabelText('기본 URL (여러 개는 줄바꿈으로 구분) *'),
      'https://a.com/p{enter}https://b.com/q',
    );
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
    await user.type(
      screen.getByLabelText('기본 URL (여러 개는 줄바꿈으로 구분) *'),
      'https://a.com/p{enter}https://b.com/q',
    );
    await user.type(screen.getByLabelText(/utm_source/i), 'google');
    await user.type(screen.getByLabelText(/utm_medium/i), 'cpc');

    await user.click(
      screen.getByRole('button', { name: /한번에 링크 만들기/ }),
    );
    await user.type(screen.getByPlaceholderText('제목 (필수)'), '제목');
    await user.type(
      screen.getByPlaceholderText('태그 (필수, 쉼표 구분)'),
      'tag1',
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
});
