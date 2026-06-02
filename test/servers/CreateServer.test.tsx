import { fireEvent, screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { CreateServer } from '../../src/servers/CreateServer';
import type { ServersMap, ServerWithId } from '../../src/servers/data';
import { checkAccessibility } from '../__helpers__/accessibility';
import { renderWithStore } from '../__helpers__/setUpTest';

const createServerConfig = vi.fn();
const isPocketBaseLoggedIn = vi.fn();

vi.mock('../../src/servers/services/serverConfigsService', () => ({
  createServerConfig: (...args: unknown[]) => createServerConfig(...args),
  isPocketBaseLoggedIn: () => isPocketBaseLoggedIn(),
}));

type SetUpOptions = {
  serversImported?: boolean;
  importFailed?: boolean;
  servers?: ServersMap;
};

describe('<CreateServer />', () => {
  const defaultServers: ServersMap = {
    foo: fromPartial({
      url: 'https://existing_url.com',
      apiKey: 'existing_api_key',
      id: 'foo',
    }),
  };
  const setUp = ({
    serversImported = false,
    importFailed = false,
    servers = defaultServers,
  }: SetUpOptions = {}) => {
    let callCount = 0;
    const useTimeoutToggle = vi.fn().mockImplementation(() => {
      const result = [
        callCount % 2 === 0 ? serversImported : importFailed,
        () => null,
      ];
      callCount += 1;
      return result;
    });
    const history = createMemoryHistory({ initialEntries: ['/foo', '/bar'] });

    return {
      history,
      ...renderWithStore(
        <Router
          location={history.location}
          navigator={history}
          unstable_useTransitions={false}
        >
          <CreateServer useTimeoutToggle={useTimeoutToggle} />
        </Router>,
        {
          initialState: { servers },
        },
      ),
    };
  };

  const fillForm = async (user: ReturnType<typeof setUp>['user']) => {
    await user.type(screen.getByLabelText(/^이름/), 'the_name');
    await user.type(screen.getByLabelText(/^URL/), 'https://the_url.com');
    await user.type(screen.getByLabelText(/^API 키/), 'the_api_key');
  };

  beforeEach(() => {
    createServerConfig.mockReset();
    isPocketBaseLoggedIn.mockReset();
  });

  it('passes a11y checks', () => {
    isPocketBaseLoggedIn.mockReturnValue(true);
    return checkAccessibility(setUp());
  });

  it('shows success message when imported is true', () => {
    setUp({ serversImported: true });

    expect(
      screen.getByText(
        '서버 정보를 가져왔습니다. 이제 목록에서 선택할 수 있습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        '서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ImportServersBtn')).not.toBeInTheDocument();
  });

  it('shows error message when import failed', () => {
    setUp({ importFailed: true });

    expect(
      screen.queryByText(
        '서버 정보를 가져왔습니다. 이제 목록에서 선택할 수 있습니다.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        '서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.',
      ),
    ).toBeInTheDocument();
  });

  it('persists the server with the PocketBase id and navigates on success', async () => {
    const savedServer: ServerWithId = {
      id: 'pb_generated_id',
      name: 'the_name',
      url: 'https://the_url.com',
      apiKey: 'the_api_key',
    };
    isPocketBaseLoggedIn.mockReturnValue(true);
    createServerConfig.mockResolvedValue(savedServer);

    const { user, history, store } = setUp();
    await fillForm(user);

    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() =>
      expect(store.getState().servers.pb_generated_id).toEqual(
        expect.objectContaining(savedServer),
      ),
    );
    expect(history.location.pathname).toEqual('/server/pb_generated_id');
    // No local fallback id derived from name/url
    expect(store.getState().servers['the_name-the_url.com']).not.toBeDefined();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not create a temporary server and shows an error when PocketBase save fails', async () => {
    isPocketBaseLoggedIn.mockReturnValue(true);
    createServerConfig.mockRejectedValue(new Error('network error'));

    const { user, history, store } = setUp();
    const serversBefore = { ...store.getState().servers };
    await fillForm(user);

    fireEvent.submit(screen.getByRole('form'));

    await screen.findByText(
      '서버를 저장하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요. 임시 서버는 생성되지 않았습니다.',
    );
    // No new server was added to the store
    expect(store.getState().servers).toEqual(serversBefore);
    expect(history.location.pathname).not.toContain('/server/');
  });

  it('blocks creation and shows an error when not logged into PocketBase', async () => {
    isPocketBaseLoggedIn.mockReturnValue(false);

    const { user, history, store } = setUp();
    const serversBefore = { ...store.getState().servers };
    await fillForm(user);

    fireEvent.submit(screen.getByRole('form'));

    await screen.findByText(
      '서버를 추가하려면 먼저 로그인해야 합니다. 로그인 후 다시 시도해 주세요.',
    );
    expect(createServerConfig).not.toHaveBeenCalled();
    expect(store.getState().servers).toEqual(serversBefore);
    expect(history.location.pathname).not.toContain('/server/');
  });

  it('displays dialog when trying to create a duplicated server', async () => {
    isPocketBaseLoggedIn.mockReturnValue(true);
    const { user, history } = setUp();

    await user.type(screen.getByLabelText(/^이름/), 'the_name');
    await user.type(screen.getByLabelText(/^URL/), 'https://existing_url.com');
    await user.type(screen.getByLabelText(/^API 키/), 'existing_api_key');

    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(history.location.pathname).toEqual('/foo'); // Goes back to first route from history's initialEntries
  });
});
