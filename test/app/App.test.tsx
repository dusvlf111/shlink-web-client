import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { act, screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import { App } from '../../src/app/App';
import { ContainerProvider } from '../../src/container/context';
import type { ServerWithId } from '../../src/servers/data';
import { checkAccessibility } from '../__helpers__/accessibility';
import { ADMIN_USER, renderWithStore } from '../__helpers__/setUpTest';

vi.mock(import('../../src/common/ShlinkWebComponentContainer'), () => ({
  ShlinkWebComponentContainer: () => <span>ShlinkWebComponentContainer</span>,
}));

vi.mock(import('../../src/utm/UtmBuilderPage'), () => ({
  UtmBuilderPage: () => <span>UtmBuilderPage</span>,
}));

vi.mock(import('../../src/utm/UtmTemplateManager'), () => ({
  UtmTemplateManager: () => <span>UtmTemplateManager</span>,
}));

vi.mock(import('../../src/utm/UtmTagManager'), () => ({
  UtmTagManager: () => <span>UtmTagManager</span>,
}));

describe('<App />', () => {
  const setUp = async (activeRoute = '/') => act(() => renderWithStore(
    <MemoryRouter initialEntries={[{ pathname: activeRoute }]}>
      <ContainerProvider
        value={fromPartial({
          HttpClient: fromPartial<HttpClient>({}),
          buildShlinkApiClient: vi.fn(),
          useTimeoutToggle: vi.fn().mockReturnValue([false, vi.fn()]),
        })}
      >
        <App />
      </ContainerProvider>
    </MemoryRouter>,
    {
      initialState: {
        servers: {
          abc123: fromPartial<ServerWithId>({ id: 'abc123', name: 'abc123 server' }),
          def456: fromPartial<ServerWithId>({ id: 'def456', name: 'def456 server' }),
        },
        settings: fromPartial({}),
        appUpdated: false,
      },
      asUser: ADMIN_USER,
    },
  ));

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it.each([
    ['/settings/general', '사용자 인터페이스'],
    ['/settings/short-urls', '단축 링크 폼'],
    ['/manage-servers', '서버 추가하기'],
    ['/server/create', '새 서버 추가'],
    ['/server/abc123/edit', '"abc123 server" 편집'],
    ['/server/def456/edit', '"def456 server" 편집'],
    ['/server/abc123/foo', 'ShlinkWebComponentContainer'],
    ['/server/def456/bar', 'ShlinkWebComponentContainer'],
    ['/other', 'Oops! We could not find requested route.'],
  ])('renders expected route', async (activeRoute, expectedComponent) => {
    await setUp(activeRoute);
    expect(screen.getByText(expectedComponent)).toBeInTheDocument();
  });

  it.each([
    ['/foo', false],
    ['/bar', false],
    ['/', true],
  ])('renders expected classes on shlink-wrapper based on current pathname', async (pathname, isFlex) => {
    await setUp(pathname);
    const shlinkWrapper = screen.getByTestId('shlink-wrapper');

    if (isFlex) {
      expect(shlinkWrapper).toHaveClass('flex');
    } else {
      expect(shlinkWrapper).not.toHaveClass('flex');
    }
  });

  it('hides the unified sidebar on the home route', async () => {
    await setUp('/');

    // Floating UTM toggle has been removed entirely
    expect(screen.queryByRole('button', { name: /utm 관리로 이동/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /overview로 이동/i })).toBeNull();
    // Home is the server picker — no sidebar there
    expect(screen.queryByTestId('unified-sidebar')).toBeNull();
  });

  it('shows the unified sidebar on non-home routes', async () => {
    await setUp('/utm-builder');
    expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
  });

  it('routes to the UTM builder via the unified sidebar link', async () => {
    await setUp('/utm-builder');
    expect(screen.getByText('UtmBuilderPage')).toBeInTheDocument();
  });
});
