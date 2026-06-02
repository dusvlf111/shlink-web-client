import { screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { MainHeader } from '../../src/common/MainHeader';
import type { UserRecord } from '../../src/lib/pocketbase';
import { checkAccessibility } from '../__helpers__/accessibility';
import {
  ADMIN_USER,
  MEMBER_USER,
  renderWithStore,
} from '../__helpers__/setUpTest';

describe('<MainHeader />', () => {
  const setUp = (pathname = '', asUser?: UserRecord) => {
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
      { asUser },
    );
  };

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
});
