import { siteInfo } from '../data/config/identity';

/**
 * 界面皮肤。每个皮肤对应 src/styles/skins/ 下的一份样式，挂在 <html data-skin> 上生效。
 * 皮肤只管形状和质感，颜色永远来自配色方案，两者可以任意组合。
 */
export const skins = ['default', 'island'] as const;

export type Skin = (typeof skins)[number];

function isSkin(value: string | undefined): value is Skin {
    return (skins as readonly string[]).includes(value ?? '');
}

/** 配置里填了不认识的皮肤就退回默认，不让站点挂掉 */
export const skin: Skin = isSkin(siteInfo.skin) ? siteInfo.skin : 'default';

/**
 * 访客还没选过配色时用哪一套。每个皮肤推荐一套和它最搭的配色：
 * 默认皮肤用 C 暖墨橙红，海岛皮肤用 L 暖奶油。访客自己切过配色后以他的选择为准。
 * 布局把它写在 <html data-default-scheme> 上，页面脚本从那里读
 */
const defaultSchemes: Record<Skin, string> = {
    default: 'C',
    island: 'L',
};

export const defaultScheme = defaultSchemes[skin];
