import type { MessageKey, Messages } from './locales/ko';

export type Locale = 'ko' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['ko', 'en'];
export const DEFAULT_LOCALE: Locale = 'ko';

export type TranslateParams = Record<string, string | number>;
export type TranslateFn = (key: MessageKey, params?: TranslateParams) => string;

export type { MessageKey, Messages };
