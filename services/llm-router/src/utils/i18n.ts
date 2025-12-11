import {
  createTranslator,
  llmRouterLocales,
  type SupportedLocale,
  type TranslationParams,
} from '@cuemate/i18n';

// 创建 llm-router 专用的 Translator 实例
const translator = createTranslator(llmRouterLocales.default);

/**
 * 翻译函数
 * @param key - 翻译键，如 'error.modelNotConfigured'
 * @param params - 插值参数，如 { model: 'gpt-4' }
 */
export function t(key: string, params?: TranslationParams): string {
  return translator.t(key, params);
}

/**
 * 设置语言
 */
export function setLocale(locale: SupportedLocale): void {
  translator.setLocale(locale);
}

/**
 * 获取当前语言
 */
export function getLocale(): SupportedLocale {
  return translator.getLocale();
}

export { translator };
