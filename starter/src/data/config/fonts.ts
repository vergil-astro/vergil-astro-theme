/**
 * 框架自带这几种字体，直接按名字用，不用放字体文件：
 *   lxgwwenkai（霞鹜文楷）、maokenZhuyuanTi（猫啃珠圆体）、inter（Inter）、monoFonts（系统等宽）
 *
 * 想用别的字体，在这里登记：字体文件放进 public/fonts/ 写 path，或者用在线字体写 cdn。
 * 名字和自带的相同时以这里为准，比如换成按自己内容生成的子集字体：
 *   lxgwwenkai: { cssName: 'LXGW WenKai', family: 'sans-serif', path: '/fonts/LXGWWenKai-Regular.woff2', format: 'woff2' },
 *   （子集默认是同目录的 LXGWWenKai-Regular-subset.woff2，也可以用 subset 指定）
 */
export const fontsRegistry: Record<string, { cssName: string; family: string; path?: string; subset?: string; cdn?: string; format?: string }> = {};

export const fonts = {
    display: 'maokenZhuyuanTi' as const,
    body: 'lxgwwenkai' as const,
    ui: 'maokenZhuyuanTi' as const,
    mono: 'monoFonts' as const,
};
