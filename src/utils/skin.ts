import { siteInfo } from '../data/config/identity';
import { locale } from '../i18n';
import { skins as registeredSkins, schemes as registeredSchemes, type AppearanceLabels } from 'virtual:vergil/appearance';

/**
 * 界面皮肤和配色。皮肤挂在 <html data-skin> 上，只管形状和质感；配色挂在 <html data-theme> 上，只管颜色，两者可以任意组合。
 * 经典皮肤和配色 A–I、K 是内置的；其他皮肤放在站点根目录的 skins/ 下，在 identity.ts 的 skins 里按名字启用，
 * 内置之外的配色只能由皮肤自带，注册过程见 src/appearance/integration.mjs。
 * 访客可以在顶栏的外观面板里切换，配置里的 skin 只决定访客没选过时用哪一个。
 */
export const skins = registeredSkins;
export const schemes = registeredSchemes;

const skinNames = skins.map((s) => s.name);

/** 访客没选过皮肤时用哪一个。填了没启用或没安装的皮肤就退回 classic，不让站点挂掉 */
export const defaultSkin: string = siteInfo.skin && skinNames.includes(siteInfo.skin) ? siteInfo.skin : 'classic';

if (siteInfo.skin && siteInfo.skin !== defaultSkin) {
    console.warn(`[vergil 外观] identity.ts 的 skin 是 "${siteInfo.skin}"，但它没有启用或没有安装，已退回 classic`);
}

/**
 * 每个皮肤推荐的配色。访客没选过配色时用当前皮肤推荐的那套，切皮肤时配色也跟着换；
 * 访客自己切过配色后以他的选择为准
 */
export const defaultSchemes: Record<string, string> = Object.fromEntries(skins.map((s) => [s.name, s.recommendedScheme]));

/** 按当前界面语言取显示名，没有就用英文，再没有就用名字本身 */
export function appearanceLabel(labels: AppearanceLabels, fallback: string): string {
    return labels[locale] ?? labels.en ?? fallback;
}
