import { screen } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { MemoryRouter } from 'react-router';
import type { ServersMap } from '../../src/servers/data';
import { ServersDropdown } from '../../src/servers/ServersDropdown';
import { checkAccessibility } from '../__helpers__/accessibility';
import { ADMIN_USER, MEMBER_USER, renderWithStore } from '../__helpers__/setUpTest';

describe('<ServersDropdown />', () => {
  const fallbackServers: ServersMap = {
    '1a': fromPartial({ name: 'foo', id: '1a' }),
    '2b': fromPartial({ name: 'bar', id: '2b' }),
    '3c': fromPartial({ name: 'baz', id: '3c' }),
  };
  const setUp = (
    servers: ServersMap = fallbackServers,
    asUser = ADMIN_USER,
  ) => renderWithStore(
    <MemoryRouter>
      <ul role="menu">
        <ServersDropdown />
      </ul>
    </MemoryRouter>,
    {
      initialState: { selectedServer: null, servers },
      asUser,
    },
  );

  it('passes a11y checks', async () => {
    const { user, ...rest } = setUp();
    // Open menu
    await user.click(screen.getByText('서버'));

    return checkAccessibility(rest);
  });

  it('contains the list of servers and the "mange servers" button', async () => {
    const { user } = setUp();

    await user.click(screen.getByText('서버'));
    const items = screen.getAllByRole('menuitem');

    // We have to add two for the "Manage servers" and the "Settings" menu items
    expect(items).toHaveLength(Object.values(fallbackServers).length + 2);
    expect(items[1]).toHaveTextContent('foo');
    expect(items[2]).toHaveTextContent('bar');
    expect(items[3]).toHaveTextContent('baz');
    expect(items[4]).toHaveTextContent('서버 관리');
  });

  it('contains a toggle with proper text', () => {
    setUp();
    expect(screen.getByRole('button')).toHaveTextContent('서버');
  });

  it('contains a button to manage servers', async () => {
    const { user } = setUp();

    await user.click(screen.getByText('서버'));
    expect(screen.getByRole('menuitem', { name: '서버 관리' })).toHaveAttribute('href', '/manage-servers');
  });

  it('shows only create link when no servers exist yet (admin)', async () => {
    const { user } = setUp({});

    await user.click(screen.getByText('서버'));
    expect(screen.getByRole('menuitem', { name: '서버 추가하기' })).toBeInTheDocument();
  });

  it('shows a contact-admin notice instead of the create link for non-admin users', async () => {
    const { user } = setUp({}, MEMBER_USER);

    await user.click(screen.getByText('서버'));
    expect(screen.queryByRole('menuitem', { name: '서버 추가하기' })).toBeNull();
    expect(screen.getByText('관리자에게 서버 등록을 요청해 주세요.')).toBeInTheDocument();
  });
});
