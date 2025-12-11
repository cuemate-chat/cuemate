import {
  createTranslator,
  ragServiceLocales,
  type SupportedLocale,
  type TranslationParams,
} from '@cuemate/i18n';

// Create rag-service specific Translator instance
const translator = createTranslator(ragServiceLocales.default);

/**
 * Translation function
 * @param key - Translation key, e.g. 'error.documentNotFound'
 * @param params - Interpolation params, e.g. { id: 'doc-123' }
 */
export function t(key: string, params?: TranslationParams): string {
  return translator.t(key, params);
}

/**
 * Set locale
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

export { translator };
