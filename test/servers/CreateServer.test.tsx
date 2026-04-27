import { fireEvent, screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { CreateServer } from '../../src/servers/CreateServer';
import type { ServersMap } from '../../src/servers/data';
import { checkAccessibility } from '../__helpers__/accessibility';
import { renderWithStore } from '../__helpers__/setUpTest';

type SetUpOptions = {
  serversImported?: boolean;
  importFailed?: boolean;
  servers?: ServersMap;
};

describe('<CreateServer />', () => {
  const defaultServers: ServersMap = {
    foo: fromPartial({ url: 'https://existing_url.com', apiKey: 'existing_api_key', id: 'foo' }),
  };
  const setUp = ({ serversImported = false, importFailed = false, servers = defaultServers }: SetUpOptions = {}) => {
    let callCount = 0;
    const useTimeoutToggle = vi.fn().mockImplementation(() => {
      const result = [callCount % 2 === 0 ? serversImported : importFailed, () => null];
      callCount += 1;
      return result;
    });
    const history = createMemoryHistory({ initialEntries: ['/foo', '/bar'] });

    return {
      history,
      ...renderWithStore(
        <Router location={history.location} navigator={history} unstable_useTransitions={false}>
          <CreateServer useTimeoutToggle={useTimeoutToggle} />
        </Router>,
        {
          initialState: { servers },
        },
      ),
    };
  };

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it('shows success message when imported is true', () => {
    setUp({ serversImported: true });

    expect(screen.getByText('서버 정보를 가져왔습니다. 이제 목록에서 선택할 수 있습니다.')).toBeInTheDocument();
    expect(
      screen.queryByText('서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ImportServersBtn')).not.toBeInTheDocument();
  });

  it('shows error message when import failed', () => {
    setUp({ importFailed: true });

    expect(
      screen.queryByText('서버 정보를 가져왔습니다. 이제 목록에서 선택할 수 있습니다.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('서버 정보를 가져오지 못했습니다. 형식이 올바른지 확인해 주세요.')).toBeInTheDocument();
  });

  it('creates server data when form is submitted', async () => {
    const { user, history, store } = setUp();
    const expectedServerId = 'the_name-the_url.com';

    await user.type(screen.getByLabelText(/^이름/), 'the_name');
    await user.type(screen.getByLabelText(/^URL/), 'https://the_url.com');
    await user.type(screen.getByLabelText(/^API 키/), 'the_api_key');

    expect(store.getState().servers[expectedServerId]).not.toBeDefined();
    fireEvent.submit(screen.getByRole('form'));
    expect(store.getState().servers[expectedServerId]).toEqual(expect.objectContaining({
      id: expectedServerId,
      name: 'the_name',
      url: 'https://the_url.com',
      apiKey: 'the_api_key',
    }));

    expect(history.location.pathname).toEqual(`/server/${expectedServerId}`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog when trying to create a duplicated server', async () => {
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
