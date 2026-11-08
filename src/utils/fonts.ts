import siteConfig, { fontsRegistry as siteFonts } from '@vergil-site/data/site-config';
import lxgwWenKai from '../fonts/LXGWWenKai-Regular.woff2?url';
import lxgwWenKaiSubset from '../fonts/LXGWWenKai-Regular-subset.woff2?url';
import maokenZhuyuanTi from '../fonts/maoken-zhuyuan-ti.woff2?url';
import maokenZhuyuanTiSubset from '../fonts/maoken-zhuyuan-ti-subset.woff2?url';

/**
 * path is the full font; subset holds only common characters and loads first for the initial screen. The full font is downloaded
 * only when the page has characters the subset lacks (see fullFamilyOf).
 * Without subset, it is derived from path as <filename>-subset.woff2 in the same directory.
 */
type FontDef = { cssName: string; family: string; path?: string; subset?: string; cdn?: string; format?: string };
type FileFont = FontDef & { path: string };
type CdnFont = FontDef & { cdn: string };

/**
 * Fonts bundled with the framework. The font files ship with the package, so sites do not need any font files in public/.
 * Fonts a site registers in fontsRegistry in src/data/config/fonts.ts are merged with these, and the site's entry wins on a name clash,
 * for example to swap in a subset font generated from its own content
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

/** Subset file: without subset, derived from path as <filename>-subset.woff2 in the same directory */
export function subsetPathOf(font: FileFont): string {
    return font.subset ?? font.path.replace('.woff2', '-subset.woff2');
}

/**
 * The subset and the full file are registered as two fonts: the subset as cssName and the full file as "cssName Full", with the subset first in the font stack.
 * For characters missing from the subset, the browser falls through the font stack to the full file and downloads it only when needed. The two URLs cannot share one @font-face src:
 * that is only a fallback for load failures, so if the subset loads, the browser never looks at the full file and missing characters render in a system font.
 * When the subset and the full file are the same file, only one is registered.
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
