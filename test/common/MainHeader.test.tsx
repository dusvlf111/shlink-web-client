import { screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { MainHeader } from '../../src/common/MainHeader';
import type { UserRecord } from '../../src/lib/pocketbase';
import type { SelectedServer, ServerWithId } from '../../src/servers/data';
import type { RootState } from '../../src/store';
import { checkAccessibility } from '../__helpers__/accessibility';
import {
  ADMIN_USER,
  MEMBER_USER,
  renderWithStore,
} from '../__helpers__/setUpTest';

describe('<MainHeader />', () => {
  const setUp = (
    pathname = '',
    asUser?: UserRecord,
    initialState?: Partial<RootState>,
  ) => {
    const history = createMemoryHistory();
    history.push(pathname);

    return renderWithStore(
      <Router
        location={history.location}
        navigator={history}
        unstable_useTransitions={false}
      >
        <MainHeader />
      </Router>,
      { asUser, initialState },
    );
  };

  const serversState = (servers: ServerWithId[]): Partial<RootState> => ({
    servers: Object.fromEntries(servers.map((s) => [s.id, s])),
  });

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it('renders ServersDropdown', () => {
    setUp();
    expect(screen.getByRole('button', { name: '서버' })).toBeInTheDocument();
  });

  it.each([
    ['/foo', false],
    ['/bar', false],
    ['/settings', true],
    ['/settings/foo', true],
    ['/settings/bar', true],
  ])(
    'sets link to settings as active only when current path is settings',
    (currentPath, isActive) => {
      setUp(currentPath);
      expect(screen.getByRole('menuitem', { name: /설정$/ })).toHaveAttribute(
        'data-active',
        isActive ? 'true' : 'false',
      );
    },
  );

  it('shows PocketBase admin link only for admins, opening admin console in a new tab', () => {
    setUp('', ADMIN_USER);
    const link = screen.getByTestId('pocketbase-admin-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('/_/'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    ['member', MEMBER_USER],
    ['anonymous', undefined],
  ])('hides PocketBase admin link for %s users', (_label, asUser) => {
    setUp('', asUser);
    expect(
      screen.queryByTestId('pocketbase-admin-link'),
    ).not.toBeInTheDocument();
  });

  it('shows the active server name from the URL', () => {
    setUp(
      '/server/srv-a/overview',
      undefined,
      serversState([
        fromPartial<ServerWithId>({ id: 'srv-a', name: 'Alpha bin' }),
        fromPartial<ServerWithId>({ id: 'srv-b', name: 'Beta bin' }),
      ]),
    );

    const indicator = screen.getByTestId('active-server-indicator');
    expect(indicator).toHaveTextContent('Alpha bin');
  });

  it('keeps the selected server name on a non-scoped page', () => {
    setUp('/history', undefined, {
      ...serversState([
        fromPartial<ServerWithId>({ id: 'first', name: 'First bin' }),
        fromPartial<ServerWithId>({ id: 'current', name: 'Current bin' }),
      ]),
      selectedServer: fromPartial<SelectedServer>({
        id: 'current',
        name: 'Current bin',
      }),
    });

    const indicator = screen.getByTestId('active-server-indicator');
    expect(indicator).toHaveTextContent('Current bin');
  });

  it('shows the no-server label when no server can be resolved', () => {
    setUp('/history');

    const indicator = screen.getByTestId('active-server-indicator');
    expect(indicator).toHaveTextContent('서버 미선택');
  });
});
