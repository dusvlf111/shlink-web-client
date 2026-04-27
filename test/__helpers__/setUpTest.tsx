import type { ShlinkApiClient } from '@shlinkio/shlink-js-sdk';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fromPartial } from '@total-typescript/shoehorn';
import type { PropsWithChildren, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { AuthProvider } from '../../src/auth/AuthContext';
import { ContainerProvider } from '../../src/container/context';
import { I18nProvider } from '../../src/i18n';
import type { Locale } from '../../src/i18n';
import type { RootState } from '../../src/store';
import { setUpStore } from '../../src/store';

export const renderWithEvents = (element: ReactElement, options?: RenderOptions) => ({
  user: userEvent.setup(),
  ...render(element, options),
});

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
};

/**
 * Render provided ReactElement wrapped in a redux `Provider`, an i18n `I18nProvider`, and a
 * `ContainerProvider` with a single `buildShlinkApiClient` dependency.
 */
export const renderWithStore = (
  element: ReactElement,
  {
    initialState = {},
    buildShlinkApiClient = vi.fn(),
    initialLocale = 'ko',
    ...options
  }: RenderOptionsWithState = {},
) => {
  const store = setUpStore(initialState);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <ContainerProvider value={fromPartial({ buildShlinkApiClient })}>
      <Provider store={store}>
        <I18nProvider initialLocale={initialLocale}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </Provider>
    </ContainerProvider>
  );

  return {
    store,
    ...renderWithEvents(element, { ...options, wrapper: Wrapper }),
  };
};
