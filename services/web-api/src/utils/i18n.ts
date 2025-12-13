import {
  createTranslator,
  webApiLocales,
  type SupportedLocale,
  type TranslationParams,
} from '@cuemate/i18n';

const translator = createTranslator(webApiLocales.default);

/**
 * Set locale for translation
 */
export function setLocale(locale: SupportedLocale): void {
  translator.setLocale(locale);
}

/**
 * Get current locale
 */
export function getLocale(): SupportedLocale {
  return translator.getLocale();
}

/**
 * Translate function
 * @param key - Translation key, e.g. 'error.invalidCredentials'
 * @param params - Interpolation params, e.g. { field: 'email' }
 */
export function t(key: string, params?: TranslationParams): string {
  return translator.t(key, params);
}
