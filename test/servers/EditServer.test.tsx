import { fireEvent, screen, waitFor } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import type { ReachableServer, SelectedServer } from '../../src/servers/data';
import { isServerWithId } from '../../src/servers/data';
import { EditServer } from '../../src/servers/EditServer';
import { checkAccessibility } from '../__helpers__/accessibility';
import { renderWithStore } from '../__helpers__/setUpTest';

describe('<EditServer />', () => {
  const defaultSelectedServer = fromPartial<ReachableServer>({
    id: 'abc123',
    name: 'the_name',
    url: 'the_url',
    apiKey: 'the_api_key',
  });
  const setUp = (selectedServer: SelectedServer = defaultSelectedServer) => {
    const history = createMemoryHistory({ initialEntries: ['/foo', '/bar'] });
    return {
      history,
      ...renderWithStore(
        <Router location={history.location} navigator={history} unstable_useTransitions={false}>
          <EditServer />
        </Router>,
        {
          initialState: {
            selectedServer,
            servers: isServerWithId(selectedServer) ? { [selectedServer.id]: selectedServer } : {},
          },
        },
      ),
    };
  };

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it('renders nothing if selected server is not reachable', () => {
    setUp(fromPartial<SelectedServer>({}));

    expect(screen.queryByText('편집')).not.toBeInTheDocument();
    expect(screen.queryByText('취소')).not.toBeInTheDocument();
    expect(screen.queryByText('저장')).not.toBeInTheDocument();
  });

  it('renders server title', () => {
    setUp();
    expect(screen.getByText(`"${defaultSelectedServer.name}" 편집`)).toBeInTheDocument();
  });

  it('display the server info in the form components', () => {
    setUp();

    expect(screen.getByLabelText(/^이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^API 키/)).toBeInTheDocument();
  });

  it('edits server and redirects to it when form is submitted', async () => {
    const { user, history, store } = setUp();

    await user.type(screen.getByLabelText(/^이름/), ' edited');
    await user.type(screen.getByLabelText(/^URL/), ' edited');
    // TODO Using fire event because userEvent.click on the Submit button does not submit the form
    // await user.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.submit(screen.getByRole('form'));

    expect(store.getState().servers[defaultSelectedServer.id]).toEqual(expect.objectContaining({
      name: 'the_name edited',
      url: 'the_url edited',
    }));

    // After saving we go back, to the first route from history's initialEntries
    expect(history.location.pathname).toEqual('/foo');
  });

  it.each([
    { forwardCredentials: true },
    { forwardCredentials: false },
  ])('edits advanced options - forward credentials', async ({ forwardCredentials }) => {
    const { user, store } = setUp({ ...defaultSelectedServer, forwardCredentials });

    await user.click(screen.getByText('고급 옵션'));
    await user.click(screen.getByLabelText('이 서버로 보내는 모든 요청에 자격 증명을 함께 전달합니다.'));
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(store.getState().servers[defaultSelectedServer.id]).toEqual(expect.objectContaining({
      forwardCredentials: !forwardCredentials,
    })));
  });
});
