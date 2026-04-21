import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UtmTagManager } from '../../src/utm/UtmTagManager';
import { renderWithEvents } from '../__helpers__/setUpTest';

const addTagMock = vi.fn(async () => undefined);
const updateTagMock = vi.fn(async () => undefined);
const deleteTagMock = vi.fn(async () => undefined);

vi.mock('../../src/utm/useUtmData', () => ({
  UTM_CATEGORIES: ['source', 'medium', 'campaign', 'term', 'content'],
  useUtmTags: () => ({
    tags: [
      { id: 'tag-1', category: 'source', value: 'google', description: '검색' },
      { id: 'tag-2', category: 'medium', value: 'cpc', description: '' },
    ],
    addTag: addTagMock,
    updateTag: updateTagMock,
    deleteTag: deleteTagMock,
  }),
}));

describe('<UtmTagManager />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setUp = () => renderWithEvents(
    <MemoryRouter initialEntries={['/utm-tag-manager']}>
      <Routes>
        <Route path="/utm-tag-manager" element={<UtmTagManager />} />
      </Routes>
    </MemoryRouter>,
  );

  it('renders heading and management menu', () => {
    setUp();
    expect(screen.getByRole('heading', { name: '태그 관리' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '빌더' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '태그 관리' })).toBeInTheDocument();
  });

  it('renders category select with all utm categories', () => {
    setUp();
    const select = screen.getByLabelText(/카테고리/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'utm_source' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'utm_medium' })).toBeInTheDocument();
  });

  it('renders existing tags', () => {
    setUp();
    expect(screen.getByText('google')).toBeInTheDocument();
    expect(screen.getByText('검색')).toBeInTheDocument();
    expect(screen.getByText('cpc')).toBeInTheDocument();
  });

  it('shows empty message for categories with no tags', () => {
    setUp();
    const emptyMessages = screen.getAllByText('태그가 없습니다.');
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('save button is disabled when value is empty', () => {
    setUp();
    const saveButton = screen.getByRole('button', { name: /태그 저장/i });
    expect(saveButton).toBeDisabled();
  });

  it('save button is enabled and calls addTag when value is filled', async () => {
    const { user } = setUp();

    await user.type(screen.getByLabelText(/태그 값/i), 'facebook');
    const saveButton = screen.getByRole('button', { name: /태그 저장/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);
    expect(addTagMock).toHaveBeenCalledWith('source', 'facebook', '');
  });

  it('populates edit form when edit button is clicked', async () => {
    const { user } = setUp();

    const editButtons = screen.getAllByRole('button', { name: '수정' });
    await user.click(editButtons[0]);

    expect(screen.getByLabelText(/태그 값/i)).toHaveValue('google');
    expect(screen.getByRole('button', { name: /태그 수정 저장/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정 취소' })).toBeInTheDocument();
  });

  it('cancels edit when cancel button is clicked', async () => {
    const { user } = setUp();

    const editButtons = screen.getAllByRole('button', { name: '수정' });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole('button', { name: '수정 취소' }));

    expect(screen.getByLabelText(/태그 값/i)).toHaveValue('');
    expect(screen.queryByRole('button', { name: '수정 취소' })).not.toBeInTheDocument();
  });

  it('calls updateTag when saving in edit mode', async () => {
    const { user } = setUp();

    const editButtons = screen.getAllByRole('button', { name: '수정' });
    await user.click(editButtons[0]);

    await user.clear(screen.getByLabelText(/태그 값/i));
    await user.type(screen.getByLabelText(/태그 값/i), 'bing');
    await user.click(screen.getByRole('button', { name: /태그 수정 저장/i }));

    expect(updateTagMock).toHaveBeenCalledWith('tag-1', 'source', 'bing', '');
  });

  it('shows save confirmation message after saving', async () => {
    const { user } = setUp();

    await user.type(screen.getByLabelText(/태그 값/i), 'naver');
    await user.click(screen.getByRole('button', { name: /태그 저장/i }));

    await waitFor(() => {
      expect(screen.getByText('태그가 저장됐습니다.')).toBeInTheDocument();
    });
  });

  it('calls deleteTag after confirm dialog', async () => {
    const { user } = setUp();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
      (btn) => btn.querySelector('svg'),
    );
    await user.click(deleteButtons[0]);

    expect(deleteTagMock).toHaveBeenCalledWith('tag-1');
  });

  it('does not call deleteTag when confirm is cancelled', async () => {
    const { user } = setUp();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const deleteButtons = screen.getAllByRole('button', { name: '' }).filter(
      (btn) => btn.querySelector('svg'),
    );
    await user.click(deleteButtons[0]);

    expect(deleteTagMock).not.toHaveBeenCalled();
  });
});
