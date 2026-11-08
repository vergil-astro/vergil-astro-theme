/**
 * Appearance bundled with the core: the classic skin and its schemes A–I and K.
 * Their styles live in src/styles/ and load together with global.css.
 *
 * Each skin can only use its own schemes: the ten here for the classic skin, and their own bundled ones for other skins.
 * Other skins are standalone packages under skins/ in the site root, enabled by name in skins in src/data/config/identity.ts; see integration.mjs.
 */

export const fallbackSkin = 'classic';
export const fallbackScheme = 'C';

/** The color of the dot on the panel (swatch) is also the color of the palette icon once selected (icon) */
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
