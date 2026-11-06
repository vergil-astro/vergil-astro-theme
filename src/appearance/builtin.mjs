/**
 * 核心自带的外观：经典皮肤和它的配色 A–I、K。
 * 它们的样式在 src/styles/ 里，跟着 global.css 一起加载。
 *
 * 每个皮肤只能选自己的配色：经典皮肤是这里的十套，其他皮肤是各自带的。
 * 其他皮肤是独立的包，放在站点根目录的 skins/ 下，在 src/data/config/identity.ts 的 skins 里按名字启用，见 integration.mjs。
 */

export const fallbackSkin = 'classic';
export const fallbackScheme = 'C';

/** 面板上的色点颜色（swatch）同时也是选中后调色盘图标的颜色（icon） */
export const builtinSchemes = [
    { id: 'A', short: 'A', labels: { 'zh-CN': '暖羊皮纸', en: 'Warm Parchment' }, swatch: '#4a7c59' },
    { id: 'B', short: 'B', labels: { 'zh-CN': '石板蓝灰', en: 'Slate Blue' }, swatch: '#4a6fa5' },
    { id: 'C', short: 'C', labels: { 'zh-CN': '暖墨橙红', en: 'Ink Orange' }, swatch: '#c0622a' },
    { id: 'D', short: 'D', labels: { 'zh-CN': '乳油玫瑰', en: 'Cream Rose' }, swatch: '#c06070' },
    { id: 'E', short: 'E', labels: { 'zh-CN': '黄油琥珀', en: 'Butter Amber' }, swatch: '#c07818' },
    { id: 'F', short: 'F', labels: { 'zh-CN': '薄荷鼠尾', en: 'Mint Sage' }, swatch: '#2a8c62' },
    { id: 'G', short: 'G', labels: { 'zh-CN': '鸢尾紫藤', en: 'Iris Wisteria' }, swatch: '#7848cc' },
    { id: 'H', short: 'H', labels: { 'zh-CN': '午夜海军', en: 'Midnight Navy' }, swatch: '#1848cc' },
    { id: 'I', short: 'I', labels: { 'zh-CN': '炭黑极简', en: 'Charcoal' }, swatch: '#141414' },
    { id: 'K', short: 'K', labels: { 'zh-CN': '沙岩暖棕', en: 'Sandstone' }, swatch: '#b86030' },
].map((scheme) => ({ ...scheme, icon: scheme.swatch }));

export const builtinSkins = [
    {
        name: 'classic',
        labels: { 'zh-CN': '经典', en: 'Classic' },
        recommendedScheme: fallbackScheme,
        schemes: builtinSchemes.map((scheme) => scheme.id),
    },
];
