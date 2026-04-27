import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UtmBulkBuilderPage } from '../../src/utm/UtmBulkBuilderPage';
import { renderWithStore } from '../__helpers__/setUpTest';

const mockTemplates = [
  {
    id: 'tpl-1',
    name: '구글 광고',
    description: '광고 캠페인',
    source: 'google',
    medium: 'cpc',
    campaign: 'spring',
    term: 'keyword',
    content: 'banner',
  },
  {
    id: 'tpl-2',
    name: '네이버 광고',
    description: '',
    source: 'naver',
    medium: 'cpc',
    campaign: 'spring',
    term: '',
    content: '',
  },
];

vi.mock('../../src/utm/useUtmData', () => ({
  useUtmTemplates: () => ({
    templates: mockTemplates,
  }),
}));

describe('<UtmBulkBuilderPage />', () => {
  const setUp = () => renderWithStore(
    <MemoryRouter initialEntries={['/server/server-1/utm-bulk-builder']}>
      <Routes>
        <Route path="/server/:serverId/utm-bulk-builder" element={<UtmBulkBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );

  it('renders heading using the i18n key', () => {
    setUp();
    expect(screen.getByRole('heading', { name: 'UTM 벌크 생성' })).toBeInTheDocument();
  });

  it('renders template checkboxes for each template', () => {
    setUp();
    expect(screen.getByLabelText(/구글 광고/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/네이버 광고/i)).toBeInTheDocument();
  });

  it('shows template description if present', () => {
    setUp();
    expect(screen.getByText('광고 캠페인')).toBeInTheDocument();
  });

  it('all templates are selected by default', () => {
    setUp();
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('toggles individual template selection', async () => {
    const { user } = setUp();
    const checkbox = screen.getByLabelText(/구글 광고/i);

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('shows toggle all button label', () => {
    setUp();
    expect(screen.getByRole('button', { name: '전체 해제' })).toBeInTheDocument();
  });

  it('shows error message when generate is clicked without base URL', async () => {
    const { user } = setUp();
    await user.click(screen.getByRole('button', { name: '생성하기' }));
    expect(screen.getByText('기본 URL을 먼저 입력해 주세요.')).toBeInTheDocument();
  });

  it('generates UTM URLs from templates when base URL is valid', async () => {
    const { user } = setUp();

    await user.type(screen.getByPlaceholderText('https://example.com/path'), 'https://example.com/page');
    await user.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => {
      expect(screen.getByText(/2개 URL이 생성되었습니다/)).toBeInTheDocument();
    });

    expect(screen.getAllByText('구글 광고').length).toBeGreaterThan(0);
    expect(screen.getByText(/utm_source=google/)).toBeInTheDocument();
  });

  it('shows "단축링크 만들기" button when serverId is present', async () => {
    const { user } = setUp();

    await user.type(screen.getByPlaceholderText('https://example.com/path'), 'https://example.com/page');
    await user.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => {
      const createButtons = screen.getAllByRole('button', { name: /단축링크 만들기/ });
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows copy all disabled before short URLs are created', async () => {
    const { user } = setUp();

    await user.type(screen.getByPlaceholderText('https://example.com/path'), 'https://example.com/page');
    await user.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => {
      expect(screen.getByText(/URL이 생성되었습니다/)).toBeInTheDocument();
    });

    const copyAllButton = screen.getByRole('button', { name: /전체 복사/ });
    expect(copyAllButton).toBeDisabled();
  });

  it('renders the initial guide text before generation', () => {
    setUp();
    expect(screen.getByText(/기본 URL을 입력하고 템플릿을 선택한 뒤/)).toBeInTheDocument();
  });
});
