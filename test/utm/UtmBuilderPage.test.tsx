import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UtmTag } from '../../src/utm/useUtmData';
import { UtmBuilderPage } from '../../src/utm/UtmBuilderPage';
import { renderWithEvents } from '../__helpers__/setUpTest';

const saveTemplateMock = vi.fn(async () => undefined);
const deleteTemplateMock = vi.fn(async () => undefined);
const addTagMock = vi.fn(async () => undefined);
const addMissingTagsMock = vi.fn(async () => undefined);
const deleteTagMock = vi.fn(async () => undefined);
let mockTags: UtmTag[] = [
  { id: 'tag-1', category: 'source', value: 'google', description: '검색 유입' },
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
    templates: [{
      id: 'tpl-1',
      name: '기본 템플릿',
      description: '광고 기본 설명',
      source: 'google',
      medium: 'cpc',
      campaign: 'spring',
      term: 'keyword',
      content: 'banner',
    }],
    saveTemplate: saveTemplateMock,
    deleteTemplate: deleteTemplateMock,
  }),
}));

describe('<UtmBuilderPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTags = [
      { id: 'tag-1', category: 'source', value: 'google', description: '검색 유입' },
      { id: 'tag-2', category: 'medium', value: 'cpc', description: '유료 클릭' },
    ];
  });

  const setUp = () => renderWithEvents(
    <MemoryRouter initialEntries={['/server/server-1/utm-builder']}>
      <Routes>
        <Route path="/server/:serverId/utm-builder" element={<UtmBuilderPage />} />
      </Routes>
    </MemoryRouter>,
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

    await user.type(
      screen.getByLabelText(/utm_source/i),
      'google',
    );

    await user.type(
      screen.getByLabelText(/utm_medium/i),
      'organic',
    );

    await user.type(
      screen.getByLabelText(/utm_campaign/i),
      'test',
    );

    await waitFor(() => {
      const urlDisplay = screen.getByText(/https:\/\/example\.com\/page\?utm_source=google/);
      expect(urlDisplay).toBeInTheDocument();
    });
  });

  it('renders back button', () => {
    setUp();
    expect(screen.getByRole('link', { name: /빌더/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /템플릿 관리/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /태그 관리/i })).toBeInTheDocument();
  });
});
