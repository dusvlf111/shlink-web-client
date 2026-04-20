import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UtmTag } from '../../src/utm/useUtmData';
import { UtmBuilderPage } from '../../src/utm/UtmBuilderPage';
import { renderWithEvents } from '../__helpers__/setUpTest';

const saveTemplateMock = vi.fn(async () => undefined);
const deleteTemplateMock = vi.fn(async () => undefined);
const addTagMock = vi.fn(async () => undefined);
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

  it('saves template with description', async () => {
    const { user } = setUp();

    await user.type(screen.getByPlaceholderText('템플릿 이름'), '신규 템플릿');
    await user.type(screen.getByPlaceholderText('템플릿 설명 (선택)'), '설명 텍스트');

    await user.click(screen.getByRole('button', { name: /현재 값 저장/i }));

    await waitFor(() => expect(saveTemplateMock).toHaveBeenCalled());
    expect(saveTemplateMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '신규 템플릿',
      description: '설명 텍스트',
    }));

    expect(screen.getByText('템플릿이 저장됐습니다.')).toBeInTheDocument();
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

  it('asks confirmation before deleting template', async () => {
    const { user } = setUp();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const templateName = screen.getByText('기본 템플릿');
    const templateRow = templateName.closest('div');
    const trashButton = templateRow?.querySelector('button:last-child') as HTMLButtonElement | null;
    expect(trashButton).not.toBeNull();

    await user.click(trashButton!);
    expect(deleteTemplateMock).not.toHaveBeenCalled();

    await user.click(trashButton!);
    await waitFor(() => expect(deleteTemplateMock).toHaveBeenCalledWith('tpl-1'));

    confirmSpy.mockRestore();
  });

  it('applies right panel tag to matching UTM field on click', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/utm_source/i)).toHaveValue('google');
    });
  });

  it('asks confirmation before deleting tag from right panel', async () => {
    const { user } = setUp();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    const deleteButtons = screen.getAllByRole('button').filter((button) => button.querySelector('svg'));
    const lastDeleteButton = deleteButtons.at(-1);
    expect(lastDeleteButton).toBeDefined();

    await user.click(lastDeleteButton!);
    expect(deleteTagMock).not.toHaveBeenCalled();

    await user.click(lastDeleteButton!);
    await waitFor(() => expect(deleteTagMock).toHaveBeenCalledWith('tag-2'));

    confirmSpy.mockRestore();
  });
});
