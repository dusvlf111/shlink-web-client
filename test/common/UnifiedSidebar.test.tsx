import { screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter, Route, Routes } from 'react-router';
import { UnifiedSidebar } from '../../src/common/UnifiedSidebar';
import type { ServerWithId } from '../../src/servers/data';
import type { RenderOptionsWithState } from '../__helpers__/setUpTest';
import { renderWithStore } from '../__helpers__/setUpTest';

// Mount the sidebar OUTSIDE <Routes> on purpose — this mirrors App.tsx where the
// sidebar is a sibling of the route switch. With this realistic layout useParams()
// cannot see :serverId, so the sidebar must derive it from the URL pathname. (The
// previous harness wrapped the sidebar in a :serverId route, which hid that bug.)
const renderAt = (initialPath: string, options: RenderOptionsWithState = {}) =>
  renderWithStore(
    <MemoryRouter initialEntries={[initialPath]}>
      <UnifiedSidebar />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
    options,
  );

const serversState = (servers: ServerWithId[]): RenderOptionsWithState => ({
  initialState: {
    servers: Object.fromEntries(servers.map((server) => [server.id, server])),
  },
});

describe('<UnifiedSidebar />', () => {
  it('renders all 9 menu items in Korean by default', () => {
    renderAt('/server/abc/utm-builder');

    // Short URL section
    expect(screen.getByRole('link', { name: /대시보드/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /단축 링크 목록/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /단축 링크 만들기/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^태그 관리$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /도메인 관리/ }),
    ).toBeInTheDocument();

    // UTM section
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /UTM 벌크 생성/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /UTM 템플릿 관리/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /UTM 태그 관리/ }),
    ).toBeInTheDocument();

    // Share section
    expect(screen.getByRole('link', { name: /통계 공유/ })).toBeInTheDocument();
  });

  it('prefixes scoped routes with the active serverId', () => {
    renderAt('/server/abc/utm-builder');

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute(
      'href',
      '/server/abc/overview',
    );
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toHaveAttribute(
      'href',
      '/server/abc/utm-builder',
    );
    expect(screen.getByRole('link', { name: /UTM 벌크 생성/ })).toHaveAttribute(
      'href',
      '/server/abc/utm-bulk-builder',
    );
  });

  it('marks the matching menu item as active', () => {
    renderAt('/server/abc/utm-bulk-builder');

    const activeLink = screen.getByRole('link', { name: /UTM 벌크 생성/ });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('disables short-url menus when no server is registered', () => {
    renderAt('/');

    // Disabled items render as <span aria-disabled> instead of <a>
    expect(screen.queryByRole('link', { name: /대시보드/ })).toBeNull();

    const disabledOverview = screen.getByText('대시보드');
    expect(disabledOverview.closest('[aria-disabled="true"]')).not.toBeNull();

    // UTM items remain reachable from the no-server scope
    expect(screen.getByRole('link', { name: /UTM 빌더/ })).toHaveAttribute(
      'href',
      '/utm-builder',
    );
  });

  it('falls back to the first registered server when the URL has no serverId', () => {
    renderAt(
      '/',
      serversState([
        fromPartial<ServerWithId>({ id: 'first', name: 'First server' }),
        fromPartial<ServerWithId>({ id: 'second', name: 'Second server' }),
      ]),
    );

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute(
      'href',
      '/server/first/overview',
    );
    expect(
      screen.getByRole('link', { name: /단축 링크 목록/ }),
    ).toHaveAttribute('href', '/server/first/list-short-urls/1');
  });

  it('prefers the autoConnect server over the first registered one', () => {
    renderAt(
      '/utm-builder',
      serversState([
        fromPartial<ServerWithId>({ id: 'first', name: 'First' }),
        fromPartial<ServerWithId>({
          id: 'preferred',
          name: 'Preferred',
          autoConnect: true,
        }),
      ]),
    );

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute(
      'href',
      '/server/preferred/overview',
    );
  });

  it('keeps the URL serverId over any fallback when both exist', () => {
    renderAt(
      '/server/from-url/utm-builder',
      serversState([
        fromPartial<ServerWithId>({
          id: 'fallback',
          name: 'Fallback',
          autoConnect: true,
        }),
      ]),
    );

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute(
      'href',
      '/server/from-url/overview',
    );
  });

  // Regression: the sidebar is rendered outside <Routes>, so it must read the
  // active serverId from the URL. Otherwise every link points at the
  // autoConnect/first server and the menu jumps to a different server than the
  // one being viewed (PRD-0602 follow-up bug).
  it('scopes menu links to the URL server, not the autoConnect server, while viewing a server', () => {
    renderAt(
      '/server/my-server/overview',
      serversState([
        fromPartial<ServerWithId>({ id: 'my-server', name: 'Mine' }),
        fromPartial<ServerWithId>({
          id: 'other',
          name: 'Other',
          autoConnect: true,
        }),
      ]),
    );

    expect(screen.getByRole('link', { name: /UTM 벌크 생성/ })).toHaveAttribute(
      'href',
      '/server/my-server/utm-bulk-builder',
    );
    expect(screen.getByRole('link', { name: /도메인 관리/ })).toHaveAttribute(
      'href',
      '/server/my-server/manage-domains',
    );
  });

  it('ignores the reserved /server/create segment and uses the fallback server', () => {
    renderAt(
      '/server/create',
      serversState([fromPartial<ServerWithId>({ id: 'real', name: 'Real' })]),
    );

    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute(
      'href',
      '/server/real/overview',
    );
  });

  it('renders English labels when locale is en', () => {
    renderWithStore(
      <MemoryRouter initialEntries={['/server/abc/utm-builder']}>
        <UnifiedSidebar />
        <Routes>
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>,
      { initialLocale: 'en' },
    );

    expect(
      screen.getByRole('link', { name: /UTM builder/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Short URL list/ }),
    ).toBeInTheDocument();
  });

  it('renders no backdrop when isOpen is false', () => {
    renderAt('/');
    expect(screen.queryByTestId('unified-sidebar-backdrop')).toBeNull();
    expect(screen.getByTestId('unified-sidebar')).toHaveAttribute(
      'data-mobile-open',
      'false',
    );
  });

  it('renders the backdrop and marks the sidebar open when isOpen is true', () => {
    renderWithStore(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={<UnifiedSidebar isOpen onClose={() => {}} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('unified-sidebar-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('unified-sidebar')).toHaveAttribute(
      'data-mobile-open',
      'true',
    );
  });
});
