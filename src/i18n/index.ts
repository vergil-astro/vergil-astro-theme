import { siteInfo } from '@vergil-site/data/config/identity';
import zhCN from './zh-CN';
import en from './en';
import { mergeText, type DeepPartial } from './merge';

const dictionaries = { 'zh-CN': zhCN, en } as const;

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof zhCN;

export const defaultLocale: Locale = 'zh-CN';

function isLocale(value: string): value is Locale {
    return value in dictionaries;
}

/** The language chosen in the config; a value with no matching dictionary falls back to the default instead of breaking the site */
export const locale: Locale = isLocale(siteInfo.locale) ? siteInfo.locale : defaultLocale;

/**
 * UI text for the current language. Read values straight off the object, with full type hints:
 *   t.nav.prev            -> the previous-post label
 *   t.nav.fromSeries('x') -> the from-series note for x
 *
 * Resolved at build time, with no runtime cost. Text the site overrides in uiText in identity.ts is applied on top; see merge.ts.
 */
export const t: Dictionary = mergeText(dictionaries[locale], (siteInfo as { uiText?: DeepPartial<Dictionary> }).uiText);
