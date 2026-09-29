import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** frontmatter 里 imageOrPath 字段的值：/ 开头的路径或外链、image() 解析出的图片、或 SVG 组件 */
export type ImageOrPath = string | ImageMetadata | ({ src: string } & ((...args: never[]) => unknown));

const IMG_ALIAS = '@img/';

/**
 * src/assets/img/ 下的所有图片，给不经过 Astro 内容处理的字符串路径用，
 * 比如图文动态 JSON 里的 images。
 */
const imgModules = import.meta.glob<{ default: ImageOrPath }>('/src/assets/img/**/*.{png,jpg,jpeg,webp,gif,avif,svg}', {
    eager: true
});

function lookupImgAlias(src: string): ImageOrPath {
    const image = imgModules[`/src/assets/img/${decodeURI(src.slice(IMG_ALIAS.length))}`]?.default;
    if (!image) throw new Error(`找不到图片 ${src}，请确认文件在 src/assets/img/ 下`);
    return image;
}

/**
 * 转成可以直接放进 <img src> 的地址。
 * - @img/ 开头的字符串：找到 src/assets/img/ 下对应的图片再处理
 * - 其他字符串原样返回
 * - SVG 不需要优化，直接用原地址（Astro 会把 SVG 解析成组件，地址挂在它的 src 上）
 * - 其他图片按 width 缩放并转成 WebP
 */
export async function resolveImageUrl(input: ImageOrPath | undefined, width: number): Promise<string | undefined> {
    if (!input) return undefined;
    if (typeof input === 'string') {
        if (!input.startsWith(IMG_ALIAS)) return input;
        input = lookupImgAlias(input);
    }
    if (typeof input === 'function' || input.format === 'svg') return input.src;
    const image = await getImage({ src: input, width: Math.min(width, input.width), format: 'webp' });
    return image.src;
}

/**
 * 把 Markdown 里 ![](@img/...) 的路径换成真实地址，给用 marked 渲染的图文动态正文用。
 * 代码块里的写法示例不动。
 */
export async function resolveImgAliasInMarkdown(markdown: string, width = 800): Promise<string> {
    if (!markdown.includes(IMG_ALIAS)) return markdown;
    const lines = markdown.split('\n');
    let fence: string | null = null;
    for (let i = 0; i < lines.length; i++) {
        const marker = lines[i].match(/^\s*(`{3,}|~{3,})/)?.[1];
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
            continue;
        }
        if (marker) {
            fence = marker;
            continue;
        }
        for (const match of lines[i].matchAll(/!\[[^\]]*\]\((@img\/[^)\s]+)/g)) {
            const url = await resolveImageUrl(match[1], width);
            if (url) lines[i] = lines[i].replace(`(${match[1]}`, `(${url}`);
        }
    }
    return lines.join('\n');
}
