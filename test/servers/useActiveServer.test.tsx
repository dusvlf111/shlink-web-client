import { screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import type { FC } from 'react';
import { MemoryRouter } from 'react-router';
import type { SelectedServer, ServerWithId } from '../../src/servers/data';
import { useActiveServer } from '../../src/servers/useActiveServer';
import type { RootState } from '../../src/store';
import { renderWithStore } from '../__helpers__/setUpTest';

// Probe component so the hook runs inside the real provider stack
// (ContainerProvider + redux Provider + I18n) that renderWithStore sets up.
const Probe: FC = () => {
  const { activeServerId, activeServer } = useActiveServer();
  return (
    <div>
      <span data-testid="id">{activeServerId ?? '(none)'}</span>
      <span data-testid="name">{activeServer?.name ?? '(none)'}</span>
    </div>
  );
};

type SetUp = {
  path: string;
  servers?: ServerWithId[];
  selectedServer?: SelectedServer;
};

const setUp = ({ path, servers = [], selectedServer }: SetUp) => {
  const initialState: Partial<RootState> = {
    servers: Object.fromEntries(servers.map((s) => [s.id, s])),
    selectedServer: selectedServer ?? null,
  };
  return renderWithStore(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
    </MemoryRouter>,
    { initialState },
  );
};

const server = (id: string, extra: Partial<ServerWithId> = {}): ServerWithId =>
  fromPartial<ServerWithId>({ id, name: `Server ${id}`, ...extra });

const activeId = () => screen.getByTestId('id').textContent;

describe('useActiveServer', () => {
  it('uses the serverId from the URL when it maps to a known server', () => {
    setUp({
      path: '/server/url-srv/overview',
      servers: [server('url-srv'), server('other', { autoConnect: true })],
    });

    expect(activeId()).toBe('url-srv');
    expect(screen.getByTestId('name')).toHaveTextContent('Server url-srv');
  });

  it('keeps the selectedServer on a non-scoped page (e.g. /history)', () => {
    setUp({
      path: '/history',
      servers: [server('first'), server('current')],
      selectedServer: fromPartial<SelectedServer>({
        id: 'current',
        name: 'Server current',
      }),
    });

    // Must NOT jump to the first/autoConnect server: keep the viewed context.
    expect(activeId()).toBe('current');
  });

  it('falls back to the autoConnect server when URL and selectedServer are absent', () => {
    setUp({
      path: '/share-stats',
      servers: [server('first'), server('preferred', { autoConnect: true })],
      selectedServer: null,
    });

    expect(activeId()).toBe('preferred');
  });

  it('falls back to the first server when there is no autoConnect server', () => {
    setUp({
      path: '/settings',
      servers: [server('first'), server('second')],
    });

    expect(activeId()).toBe('first');
  });

  it('returns nothing when no servers are registered', () => {
    setUp({ path: '/history' });

    expect(activeId()).toBe('(none)');
    expect(screen.getByTestId('name')).toHaveTextContent('(none)');
  });

  it('ignores a NotFound selectedServer and uses the fallback', () => {
    setUp({
      path: '/history',
      servers: [server('first')],
      selectedServer: fromPartial<SelectedServer>({ serverNotFound: true }),
    });

    expect(activeId()).toBe('first');
  });

  it('ignores the reserved /server/create segment', () => {
    setUp({
      path: '/server/create',
      servers: [server('real')],
    });

    expect(activeId()).toBe('real');
  });

  it('prefers the URL server over the selectedServer when both exist', () => {
    setUp({
      path: '/server/from-url/overview',
      servers: [server('from-url'), server('from-redux')],
      selectedServer: fromPartial<SelectedServer>({ id: 'from-redux' }),
    });

    expect(activeId()).toBe('from-url');
  });
});
