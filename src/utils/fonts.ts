import siteConfig, { fontsRegistry as siteFonts } from '@vergil-site/data/site-config';
import lxgwWenKai from '../fonts/LXGWWenKai-Regular.woff2?url';
import lxgwWenKaiSubset from '../fonts/LXGWWenKai-Regular-subset.woff2?url';
import maokenZhuyuanTi from '../fonts/maoken-zhuyuan-ti.woff2?url';
import maokenZhuyuanTiSubset from '../fonts/maoken-zhuyuan-ti-subset.woff2?url';

/**
 * path 是完整字体；subset 是只含常用字的子集，首屏先加载它，完整字体在后台补齐缺的字。
 * 不写 subset 时按 path 推出同目录下的 <文件名>-subset.woff2。
 */
type FontDef = { cssName: string; family: string; path?: string; subset?: string; cdn?: string; format?: string };
type FileFont = FontDef & { path: string };
type CdnFont = FontDef & { cdn: string };

/**
 * 框架自带的字体，字体文件随包发布，站点不用在 public/ 里放任何字体文件。
 * 站点在 src/data/config/fonts.ts 的 fontsRegistry 里登记的字体会和这里合并，同名时以站点的为准，
 * 比如换成自己按内容生成的子集字体
 */
const builtinFonts: Record<string, FontDef> = {
    inter: {
        cssName: 'Inter Variable',
        family: 'sans-serif',
    },
    lxgwwenkai: {
        cssName: 'LXGW WenKai',
        family: 'sans-serif',
        path: lxgwWenKai,
        subset: lxgwWenKaiSubset,
        format: 'woff2',
    },
    maokenZhuyuanTi: {
        cssName: 'MaokenZhuyuanTi',
        family: 'sans-serif',
        path: maokenZhuyuanTi,
        subset: maokenZhuyuanTiSubset,
        format: 'woff2',
    },
    monoFonts: {
        cssName: 'ui-monospace',
        family: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
    },
};

const fontsRegistry: Record<string, FontDef> = { ...builtinFonts, ...siteFonts };

export type FontKey = string;

function isCdnFont(font: FontDef): font is CdnFont {
    return typeof font.cdn === 'string' && font.cdn.length > 0;
}

function isFileFont(font: FontDef): font is FileFont {
    return typeof font.path === 'string' && font.path.length > 0;
}

/** 子集文件：没写 subset 时按 path 推出同目录下的 <文件名>-subset.woff2 */
export function subsetPathOf(font: FileFont): string {
    return font.subset ?? font.path.replace('.woff2', '-subset.woff2');
}

/**
 * 子集和完整文件登记成两个字体：子集用 cssName，完整文件用「cssName Full」，字体栈里子集在前。
 * 子集里缺的字，浏览器顺着字体栈去用完整文件，用到时才下载它。两个地址不能写进同一条 @font-face 的 src：
 * 那只是加载失败时的备选，子集能加载，浏览器就不会再看完整文件，缺的字只能显示成系统字体。
 * 子集和完整文件是同一个文件时，只登记一个。
 */
export function fullFamilyOf(font: FileFont): string | null {
    return subsetPathOf(font) === font.path ? null : `${font.cssName} Full`;
}

export function getFontCssValue(key: FontKey): string {
    const font = fontsRegistry[key];
    const full = isFileFont(font) ? fullFamilyOf(font) : null;
    return full ? `'${font.cssName}', '${full}', ${font.family}` : `'${font.cssName}', ${font.family}`;
}

function collectFonts(keys: FontKey[]) {
    const usedKeys = [...new Set(keys)];
    const cdnFonts: CdnFont[] = [];
    const fileFonts: FileFont[] = [];

    for (const k of usedKeys) {
        const font = fontsRegistry[k] as FontDef;
        if (isFileFont(font)) {
            fileFonts.push(font);
        } else if (isCdnFont(font)) {
            cdnFonts.push(font);
        }
    }

    return { cdnFonts, fileFonts };
}

export function getSiteFonts(): {
    display: string;
    body: string;
    ui: string;
    mono: string;
    cdnFonts: CdnFont[];
    fileFonts: FileFont[];
} {
    const display = siteConfig.fonts.display as FontKey;
    const body = siteConfig.fonts.body as FontKey;
    const ui = siteConfig.fonts.ui as FontKey;
    const mono = siteConfig.fonts.mono as FontKey;
    const { cdnFonts, fileFonts } = collectFonts([display, body, ui, mono]);
    return {
        display: getFontCssValue(display),
        body: getFontCssValue(body),
        ui: getFontCssValue(ui),
        mono: getFontCssValue(mono),
        cdnFonts,
        fileFonts,
    };
}

export function resolveFontOverrides(
    overrides?: Partial<Record<'display' | 'body', string>>
): {
    display: string;
    body: string;
    ui: string;
    mono: string;
    cdnFonts: CdnFont[];
    fileFonts: FileFont[];
} {
    const display = (overrides?.display && overrides.display in fontsRegistry ? overrides.display : siteConfig.fonts.display) as FontKey;
    const body = (overrides?.body && overrides.body in fontsRegistry ? overrides.body : siteConfig.fonts.body) as FontKey;
    const ui = siteConfig.fonts.ui as FontKey;
    const mono = siteConfig.fonts.mono as FontKey;
    const { cdnFonts, fileFonts } = collectFonts([display, body, ui, mono]);
    return {
        display: getFontCssValue(display),
        body: getFontCssValue(body),
        ui: getFontCssValue(ui),
        mono: getFontCssValue(mono),
        cdnFonts,
        fileFonts,
    };
}
