import type { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fromPartial } from '@total-typescript/shoehorn';
import type { FC, PropsWithChildren, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { AuthContext, AuthProvider } from '../../src/auth/AuthContext';
import { ContainerProvider } from '../../src/container/context';
import { I18nProvider } from '../../src/i18n';
import type { Locale } from '../../src/i18n';
import type { UserRecord } from '../../src/lib/pocketbase';
import type { RootState } from '../../src/store';
import { setUpStore } from '../../src/store';

export const renderWithEvents = (element: ReactElement, options?: RenderOptions) => ({
  user: userEvent.setup(),
  ...render(element, options),
});

export const ADMIN_USER: UserRecord = {
  id: 'admin-id',
  email: 'admin@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
};

export const MEMBER_USER: UserRecord = {
  id: 'member-id',
  email: 'member@test',
  name: 'Member',
  role: 'member',
  status: 'active',
};

export type RenderOptionsWithState = Omit<RenderOptions, 'wrapper'> & {
  /** Initial state for the redux store */
  initialState?: Partial<RootState>;

  /**
   * If provided, it will set this as the `buildShlinkApiClient` dependency in the `ContainerProvider`.
   * If more dependencies are needed, then explicitly define your own `ContainerProvider` and make sure it includes a
   * `buildShlinkApiClient` service.
   *
   * Defaults to vi.fn()
   */
  buildShlinkApiClient?: () => ShlinkApiClient;

  /** Initial locale for the I18nProvider. Defaults to 'ko'. */
  initialLocale?: Locale;

  /**
   * If provided, mounts a stubbed AuthContext with this user instead of the real AuthProvider.
   * Use this to test admin-only flows without touching pb.authStore.
   */
  asUser?: UserRecord;
};

/**
 * Render provided ReactElement wrapped in a redux `Provider`, an i18n `I18nProvider`, and a
 * `ContainerProvider` with a single `buildShlinkApiClient` dependency.
 */
const buildAuthWrapper = (asUser: UserRecord | undefined): FC<PropsWithChildren> => {
  if (!asUser) {
    return AuthProvider;
  }
  const stubValue = {
    user: asUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };
  return ({ children }) => (
    <AuthContext.Provider value={stubValue}>{children}</AuthContext.Provider>
  );
};

export const renderWithStore = (
  element: ReactElement,
  {
    initialState = {},
    buildShlinkApiClient = vi.fn(),
    initialLocale = 'ko',
    asUser,
    ...options
  }: RenderOptionsWithState = {},
) => {
  const store = setUpStore(initialState);
  const AuthWrapper = buildAuthWrapper(asUser);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ContainerProvider value={fromPartial({ buildShlinkApiClient })}>
      <Provider store={store}>
        <I18nProvider initialLocale={initialLocale}>
          <AuthWrapper>{children}</AuthWrapper>
        </I18nProvider>
      </Provider>
    </ContainerProvider>
  );

  return {
    store,
    ...renderWithEvents(element, { ...options, wrapper: Wrapper }),
  };
};
