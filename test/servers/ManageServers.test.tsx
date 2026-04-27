import { screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import type { ServersMap, ServerWithId } from '../../src/servers/data';
import { ManageServers } from '../../src/servers/ManageServers';
import type { ServersExporter } from '../../src/servers/services/ServersExporter';
import { checkAccessibility } from '../__helpers__/accessibility';
import { ADMIN_USER, renderWithStore } from '../__helpers__/setUpTest';

describe('<ManageServers />', () => {
  const exportServers = vi.fn();
  const serversExporter = fromPartial<ServersExporter>({ exportServers });
  const useTimeoutToggle = vi.fn().mockReturnValue([false, vi.fn()]);
  const createServerMock = (value: string, autoConnect = false) => fromPartial<ServerWithId>(
    { id: value, name: value, url: value, autoConnect },
  );
  const setUp = (servers: ServersMap = {}) => renderWithStore(
    <MemoryRouter>
      <ManageServers useTimeoutToggle={useTimeoutToggle} ServersExporter={serversExporter} />
    </MemoryRouter>,
    {
      initialState: { servers },
      asUser: ADMIN_USER,
    },
  );

  it('passes a11y checks', () => checkAccessibility(setUp({
    foo: createServerMock('foo'),
    bar: createServerMock('bar'),
    baz: createServerMock('baz'),
  })));

  it('shows search field which allows searching servers, affecting te amount of rendered rows', async () => {
    const { user } = setUp({
      foo: createServerMock('foo'),
      bar: createServerMock('bar'),
      baz: createServerMock('baz'),
    });
    const search = async (searchTerm: string) => {
      await user.clear(screen.getByPlaceholderText('Search...'));
      await user.type(screen.getByPlaceholderText('Search...'), searchTerm);
    };
    // Add one for the header row
    const expectRows = (amount: number) => expect(screen.getAllByRole('row')).toHaveLength(amount + 1);

    expectRows(3);
    expect(screen.queryByText('서버를 찾을 수 없습니다.')).not.toBeInTheDocument();

    await search('foo');
    await waitFor(() => expectRows(1));
    expect(screen.queryByText('서버를 찾을 수 없습니다.')).not.toBeInTheDocument();

    await search('Ba');
    await waitFor(() => expectRows(2));
    expect(screen.queryByText('서버를 찾을 수 없습니다.')).not.toBeInTheDocument();

    await search('invalid');
    await waitFor(() => expectRows(1));
    expect(screen.getByText('서버를 찾을 수 없습니다.')).toBeInTheDocument();
  });

  it.each([
    [createServerMock('foo'), 3],
    [createServerMock('foo', true), 4],
  ])('shows different amount of columns if there are at least one auto-connect server', (server, expectedCols) => {
    setUp({ server });

    expect(screen.getAllByRole('columnheader')).toHaveLength(expectedCols);
    if (server.autoConnect) {
      expect(screen.getByTestId('auto-connect')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('auto-connect')).not.toBeInTheDocument();
    }
  });

  it.each([
    [{}, 0],
    [{ foo: createServerMock('foo') }, 1],
  ])('shows export button if the list of servers is not empty', (servers, expectedButtons) => {
    setUp(servers);
    expect(screen.queryAllByRole('button', { name: '서버 내보내기' })).toHaveLength(expectedButtons);
  });

  it('allows exporting servers when clicking on button', async () => {
    const { user } = setUp({ foo: createServerMock('foo') });

    expect(exportServers).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '서버 내보내기' }));
    expect(exportServers).toHaveBeenCalled();
  });

  it.each([[true], [false]])('shows an error message if an error occurs while importing servers', (hasError) => {
    useTimeoutToggle.mockReturnValue([hasError, vi.fn()]);

    setUp({ foo: createServerMock('foo') });

    if (hasError) {
      expect(
        screen.getByText('서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.'),
      ).toBeInTheDocument();
    } else {
      expect(
        screen.queryByText('서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.'),
      ).not.toBeInTheDocument();
    }
  });
});
