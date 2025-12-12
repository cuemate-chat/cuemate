/**
 * i18n Translator Core
 *
 * 支持的语言:
 * - zh-CN: 简体中文
 * - zh-TW: 繁体中文
 * - en-US: English
 */

export type SupportedLocale = 'zh-CN' | 'zh-TW' | 'en-US';

export type TranslationModule = 'desktop' | 'web' | 'web-api' | 'llm-router' | 'rag-service';

// 翻译资源类型定义（使用 interface 避免循环引用）
export interface TranslationResources {
    [key: string]: string | TranslationResources;
}

// 翻译参数类型
export type TranslationParams = Record<string, string | number>;

/**
 * Translator 类
 * 用于后端服务的翻译（非 React 环境）
 */
export class Translator {
    private locale: SupportedLocale;
    private resources: Record<SupportedLocale, TranslationResources>;
    private fallbackLocale: SupportedLocale = 'zh-CN';

    constructor(
        resources: Record<SupportedLocale, TranslationResources>,
        defaultLocale: SupportedLocale = 'zh-CN'
    ) {
        this.resources = resources;
        this.locale = defaultLocale;
    }

    /**
     * 设置当前语言
     */
    setLocale(locale: SupportedLocale): void {
        this.locale = locale;
    }

    /**
     * 获取当前语言
     */
    getLocale(): SupportedLocale {
        return this.locale;
    }

    /**
     * 翻译函数
     * @param key - 翻译键，支持点号分隔的嵌套路径，如 'error.network_error'
     * @param params - 插值参数，如 { port: 8080 }
     * @returns 翻译后的字符串
     */
    t(key: string, params?: TranslationParams): string {
        // 尝试当前语言
        let value = this.getValue(this.resources[this.locale], key);

        // 如果找不到，尝试回退语言
        if (value === undefined && this.locale !== this.fallbackLocale) {
            value = this.getValue(this.resources[this.fallbackLocale], key);
        }

        // 如果还是找不到，返回 key 本身
        if (value === undefined) {
            console.warn(`[i18n] Missing translation for key: ${key}`);
            return key;
        }

        // 插值替换
        if (params && typeof value === 'string') {
            return this.interpolate(value, params);
        }

        return typeof value === 'string' ? value : key;
    }

    /**
     * 根据点号分隔的路径获取嵌套对象的值
     */
    private getValue(obj: TranslationResources | undefined, path: string): string | undefined {
        if (!obj) return undefined;

        const keys = path.split('.');
        let current: TranslationResources | string | undefined = obj;

        for (const key of keys) {
            if (current === undefined || typeof current === 'string') {
                return undefined;
            }
            current = current[key] as TranslationResources | string | undefined;
        }

        return typeof current === 'string' ? current : undefined;
    }

    /**
     * 插值替换
     * 支持 {variable} 格式
     */
    private interpolate(template: string, params: TranslationParams): string {
        return template.replace(/\{(\w+)\}/g, (_, key) => {
            return params[key] !== undefined ? String(params[key]) : `{${key}}`;
        });
    }
}

/**
 * 创建 Translator 实例的工厂函数
 */
export function createTranslator(
    resources: Record<SupportedLocale, TranslationResources>,
    defaultLocale: SupportedLocale = 'zh-CN'
): Translator {
    return new Translator(resources, defaultLocale);
}

/**
 * 支持的语言列表
 */
export const supportedLocales: SupportedLocale[] = ['zh-CN', 'zh-TW', 'en-US'];

/**
 * 语言显示名称
 */
export const localeNames: Record<SupportedLocale, string> = {
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'en-US': 'English'
};

/**
 * 检查是否为支持的语言
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
    return supportedLocales.includes(locale as SupportedLocale);
}

/**
 * 获取有效的语言（如果不支持则返回默认语言）
 */
export function getValidLocale(locale: string | undefined, defaultLocale: SupportedLocale = 'zh-CN'): SupportedLocale {
    if (locale && isSupportedLocale(locale)) {
        return locale;
    }
    return defaultLocale;
}
