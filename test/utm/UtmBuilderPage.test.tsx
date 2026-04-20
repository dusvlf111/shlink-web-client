import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UtmBuilderPage } from '../../src/utm/UtmBuilderPage';
import { renderWithEvents } from '../__helpers__/setUpTest';

const saveTemplateMock = vi.fn(async () => undefined);
const deleteTemplateMock = vi.fn(async () => undefined);
const addTagMock = vi.fn(async () => undefined);
const deleteTagMock = vi.fn(async () => undefined);

vi.mock('../../src/utm/useUtmData', () => ({
  UTM_CATEGORIES: ['source', 'medium', 'campaign', 'term', 'content'],
  useUtmTags: () => ({
    tags: [],
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
});
