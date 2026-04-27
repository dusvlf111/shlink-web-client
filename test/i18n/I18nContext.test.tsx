import { act, render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { I18nProvider, useLocale, useT } from '../../src/i18n';

const STORAGE_KEY = 'shlink-locale';

const Probe: FC = () => {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="settings">{t('header.settings')}</span>
      <span data-testid="generated">{t('utm.bulk.message.generated', { count: 3 })}</span>
      <button type="button" onClick={() => setLocale('en')}>switch-en</button>
    </div>
  );
};

describe('<I18nProvider />', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns Korean text for the default locale', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('ko');
    expect(screen.getByTestId('settings')).toHaveTextContent('설정');
  });

  it('interpolates {param} placeholders', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('generated')).toHaveTextContent('3개 URL이 생성되었습니다.');
  });

  it('switches locale and persists it to localStorage', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    await act(async () => {
      screen.getByText('switch-en').click();
    });

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('settings')).toHaveTextContent('Settings');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('reads the persisted locale on next mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'en');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('settings')).toHaveTextContent('Settings');
  });

  it('honours initialLocale prop and ignores stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'en');

    render(
      <I18nProvider initialLocale="ko">
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('ko');
    expect(screen.getByTestId('settings')).toHaveTextContent('설정');
  });
});
