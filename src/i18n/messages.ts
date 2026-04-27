import { enMessages } from './locales/en';
import { koMessages } from './locales/ko';
import type { Locale, Messages } from './types';

export const MESSAGES: Record<Locale, Messages> = {
  ko: koMessages,
  en: enMessages,
};
