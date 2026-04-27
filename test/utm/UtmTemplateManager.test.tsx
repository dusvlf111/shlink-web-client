import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UtmTemplateManager } from '../../src/utm/UtmTemplateManager';
import { renderWithStore } from '../__helpers__/setUpTest';

const saveTemplateMock = vi.fn(async () => undefined);
const updateTemplateMock = vi.fn(async () => undefined);
const deleteTemplateMock = vi.fn(async () => undefined);

const mockTemplates = [
  {
    id: 'tpl-1',
    name: '기본 템플릿',
    description: '광고 기본',
    source: 'google',
    medium: 'cpc',
    campaign: 'spring',
    term: 'keyword',
    content: 'banner',
  },
];

vi.mock('../../src/utm/useUtmData', () => ({
  UTM_CATEGORIES: ['source', 'medium', 'campaign', 'term', 'content'],
  useUtmTemplates: () => ({
    templates: mockTemplates,
    saveTemplate: saveTemplateMock,
    updateTemplate: updateTemplateMock,
    deleteTemplate: deleteTemplateMock,
  }),
  useUtmTags: () => ({
    tags: [
      { id: 'tag-1', category: 'source', value: 'google', description: '구글 검색' },
    ],
    addTag: vi.fn(),
    deleteTag: vi.fn(),
  }),
}));

describe('<UtmTemplateManager />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setUp = () => renderWithStore(
    <MemoryRouter initialEntries={['/utm-template-manager']}>
      <Routes>
        <Route path="/utm-template-manager" element={<UtmTemplateManager />} />
      </Routes>
    </MemoryRouter>,
  );

  it('renders heading using the i18n key', () => {
    setUp();
    expect(screen.getByRole('heading', { name: 'UTM 템플릿 관리' })).toBeInTheDocument();
  });

  it('renders the form inputs', () => {
    setUp();
    expect(screen.getByLabelText(/템플릿 이름/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/설명/i)).toBeInTheDocument();
    expect(screen.getByLabelText('utm_source')).toBeInTheDocument();
    expect(screen.getByLabelText('utm_medium')).toBeInTheDocument();
    expect(screen.getByLabelText('utm_campaign')).toBeInTheDocument();
  });

  it('renders existing templates', () => {
    setUp();
    expect(screen.getByText('기본 템플릿')).toBeInTheDocument();
    expect(screen.getByText('광고 기본')).toBeInTheDocument();
    expect(screen.getByText(/utm_source: google/)).toBeInTheDocument();
  });

  it('save button is disabled when name is empty', () => {
    setUp();
    const saveButton = screen.getByRole('button', { name: /템플릿 저장/i });
    expect(saveButton).toBeDisabled();
  });

  it('calls saveTemplate with form data when save button clicked', async () => {
    const { user } = setUp();

    await user.type(screen.getByLabelText(/템플릿 이름/i), '신규 템플릿');
    await user.type(screen.getByLabelText('utm_source'), 'naver');
    await user.type(screen.getByLabelText('utm_medium'), 'organic');

    await user.click(screen.getByRole('button', { name: /템플릿 저장/i }));

    expect(saveTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '신규 템플릿',
        source: 'naver',
        medium: 'organic',
      }),
    );
  });

  it('shows save confirmation message', async () => {
    const { user } = setUp();

    await user.type(screen.getByLabelText(/템플릿 이름/i), '테스트');
    await user.click(screen.getByRole('button', { name: /템플릿 저장/i }));

    await waitFor(() => {
      expect(screen.getByText('템플릿이 저장됐습니다.')).toBeInTheDocument();
    });
  });

  it('populates edit form and shows update/cancel buttons when edit clicked', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '수정' }));

    expect(screen.getByLabelText(/템플릿 이름/i)).toHaveValue('기본 템플릿');
    expect(screen.getByLabelText('utm_source')).toHaveValue('google');
    expect(screen.getByRole('button', { name: /템플릿 수정 저장/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정 취소' })).toBeInTheDocument();
  });

  it('calls updateTemplate when saving in edit mode', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '수정' }));
    await user.clear(screen.getByLabelText(/템플릿 이름/i));
    await user.type(screen.getByLabelText(/템플릿 이름/i), '수정된 템플릿');
    await user.click(screen.getByRole('button', { name: /템플릿 수정 저장/i }));

    expect(updateTemplateMock).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({ name: '수정된 템플릿' }),
    );
  });

  it('cancels edit and resets form', async () => {
    const { user } = setUp();

    await user.click(screen.getByRole('button', { name: '수정' }));
    await user.click(screen.getByRole('button', { name: '수정 취소' }));

    expect(screen.getByLabelText(/템플릿 이름/i)).toHaveValue('');
    expect(screen.queryByRole('button', { name: '수정 취소' })).not.toBeInTheDocument();
  });

  it('calls deleteTemplate after confirm', async () => {
    const { user } = setUp();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await user.click(screen.getByRole('button', { name: '' }));

    expect(deleteTemplateMock).toHaveBeenCalledWith('tpl-1');
  });

  it('does not call deleteTemplate when confirm is cancelled', async () => {
    const { user } = setUp();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await user.click(screen.getByRole('button', { name: '' }));

    expect(deleteTemplateMock).not.toHaveBeenCalled();
  });

  it('shows suggestions when field is focused and tags match', async () => {
    const { user } = setUp();

    await user.click(screen.getByLabelText('utm_source'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^google/ })).toBeInTheDocument();
    });
  });

  it('applies suggestion value when suggestion button is clicked', async () => {
    const { user } = setUp();

    await user.click(screen.getByLabelText('utm_source'));
    await waitFor(() => screen.getByRole('button', { name: /^google/ }));
    await user.click(screen.getByRole('button', { name: /^google/ }));

    expect(screen.getByLabelText('utm_source')).toHaveValue('google');
  });
});
