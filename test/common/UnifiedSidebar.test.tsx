import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UnifiedSidebar } from '../../src/common/UnifiedSidebar';
import { renderWithStore } from '../__helpers__/setUpTest';

const renderAt = (initialPath: string) => renderWithStore(
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/server/:serverId/*" element={<UnifiedSidebar />} />
      <Route path="*" element={<UnifiedSidebar />} />
    </Routes>
  </MemoryRouter>,
);

describe('<UnifiedSidebar />', () => {
  it('renders all 9 menu items in Korean by default', () => {
    renderAt('/server/abc/utm-builder');

    // Short URL section
    expect(screen.getByRole('link', { name: /대시보드/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /단축 링크 목록/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /단축 링크 만들기/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^태그 관리$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /도메인 관리/ })).toBeInTheDocument();

    // UTM section
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /UTM 벌크 생성/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /UTM 템플릿 관리/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /UTM 태그 관리/ })).toBeInTheDocument();
  });

  it('prefixes scoped routes with the active serverId', () => {
    renderAt('/server/abc/utm-builder');

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute('href', '/server/abc/overview');
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toHaveAttribute('href', '/server/abc/utm-builder');
    expect(screen.getByRole('link', { name: /UTM 벌크 생성/ })).toHaveAttribute('href', '/server/abc/utm-bulk-builder');
  });

  it('marks the matching menu item as active', () => {
    renderAt('/server/abc/utm-bulk-builder');

    const activeLink = screen.getByRole('link', { name: /UTM 벌크 생성/ });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('disables short-url menus when no server is selected', () => {
    renderAt('/');

    // Disabled items render as <span aria-disabled> instead of <a>
    expect(screen.queryByRole('link', { name: /대시보드/ })).toBeNull();

    const disabledOverview = screen.getByText('대시보드');
    expect(disabledOverview.closest('[aria-disabled="true"]')).not.toBeNull();

    // UTM items remain reachable from the no-server scope
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toHaveAttribute('href', '/utm-builder');
  });

  it('renders English labels when locale is en', () => {
    renderWithStore(
      <MemoryRouter initialEntries={['/server/abc/utm-builder']}>
        <Routes>
          <Route path="/server/:serverId/*" element={<UnifiedSidebar />} />
        </Routes>
      </MemoryRouter>,
      { initialLocale: 'en' },
    );

    expect(screen.getByRole('link', { name: /UTM builder/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Short URL list/ })).toBeInTheDocument();
  });
});
