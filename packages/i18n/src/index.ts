/**
 * @cuemate/i18n
 *
 * CueMate 国际化包
 * 提供翻译工具和多语言资源
 */

export {
    Translator,
    createTranslator,
    supportedLocales,
    localeNames,
    isSupportedLocale,
    getValidLocale
} from './translator.js';

export type {
    SupportedLocale,
    TranslationModule,
    TranslationResources,
    TranslationParams
} from './translator.js';

// 导出各模块的翻译资源
export * as desktopLocales from './locales/desktop/index.js';
export * as webLocales from './locales/web/index.js';
export * as webApiLocales from './locales/web-api/index.js';
export * as llmRouterLocales from './locales/llm-router/index.js';
export * as ragServiceLocales from './locales/rag-service/index.js';
export * as asrLocales from './locales/asr/index.js';
