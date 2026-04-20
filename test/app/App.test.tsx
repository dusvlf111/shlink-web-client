import type { HttpClient } from '@shlinkio/shlink-js-sdk';
import { act, screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import { App } from '../../src/app/App';
import { ContainerProvider } from '../../src/container/context';
import type { ServerWithId } from '../../src/servers/data';
import { checkAccessibility } from '../__helpers__/accessibility';
import { renderWithStore } from '../__helpers__/setUpTest';

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
    },
  ));

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it.each([
    ['/settings/general', 'User interface'],
    ['/settings/short-urls', 'Short URLs form'],
    ['/manage-servers', 'Add a server'],
    ['/server/create', 'Add new server'],
    ['/server/abc123/edit', 'Edit "abc123 server"'],
    ['/server/def456/edit', 'Edit "def456 server"'],
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

  it('toggles the floating UTM button between UTM management and overview', async () => {
    await setUp('/');

    expect(screen.getByRole('button', { name: /utm 관리로 이동/i })).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: /utm 관리로 이동/i }).click();
    });

    expect(screen.getByText('UtmBuilderPage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /overview로 이동/i })).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: /overview로 이동/i }).click();
    });

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('moves to root overview when clicking the floating button from a server UTM route', async () => {
    await setUp('/server/abc123/utm-builder');

    expect(screen.getByRole('button', { name: /overview로 이동/i })).toBeInTheDocument();

    await act(async () => {
      screen.getByRole('button', { name: /overview로 이동/i }).click();
    });

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });
});
