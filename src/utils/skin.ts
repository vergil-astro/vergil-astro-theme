import { siteInfo } from '@vergil-site/data/config/identity';
import { locale, t } from '../i18n';
import { skins as registeredSkins, schemes as registeredSchemes, type AppearanceLabels } from 'virtual:vergil/appearance';

/**
 * UI skins and color schemes. The skin lives on <html data-skin> and controls only shape and texture; the color scheme lives on <html data-theme> and controls only color.
 * Each skin can only use its own schemes: the classic skin and its schemes A–I and K are built in; other skins live under skins/ in the site root,
 * are enabled by name in skins in identity.ts, and bring their own schemes; see src/appearance/integration.mjs for how they are registered.
 * Visitors can switch in the appearance panel in the top bar; skin in the config only decides which one to use when the visitor has not picked one.
 */
export const skins = registeredSkins;
export const schemes = registeredSchemes;

const skinNames = skins.map((s) => s.name);

/** Skin to use when the visitor has not picked one. A skin that is not enabled or installed falls back to classic instead of breaking the site */
export const defaultSkin: string = siteInfo.skin && skinNames.includes(siteInfo.skin) ? siteInfo.skin : 'classic';

if (siteInfo.skin && siteInfo.skin !== defaultSkin) {
    console.warn(`${t.build.appearance.prefix} ${t.build.appearance.skinFallback(siteInfo.skin)}`);
}

/** Each skin's default color scheme. When a visitor switches skins, the scheme resets to the new skin's default, and they can then pick from that skin's own schemes */
export const defaultSchemes: Record<string, string> = Object.fromEntries(skins.map((s) => [s.name, s.recommendedScheme]));

/** Color scheme IDs available under each skin */
export const skinSchemes: Record<string, string[]> = Object.fromEntries(skins.map((s) => [s.name, s.schemes]));

/** Get the display name for the current UI language, falling back to English, then to the name itself */
export function appearanceLabel(labels: AppearanceLabels, fallback: string): string {
    return labels[locale] ?? labels.en ?? fallback;
}
