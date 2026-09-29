import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** frontmatter 里 imageOrPath 字段的值：/ 开头的路径或外链、image() 解析出的图片、或 SVG 组件 */
export type ImageOrPath = string | ImageMetadata | ({ src: string } & ((...args: never[]) => unknown));

/**
 * 转成可以直接放进 <img src> 的地址。
 * - 字符串原样返回
 * - SVG 不需要优化，直接用原地址（Astro 会把 SVG 解析成组件，地址挂在它的 src 上）
 * - 其他图片按 width 缩放并转成 WebP
 */
export async function resolveImageUrl(input: ImageOrPath | undefined, width: number): Promise<string | undefined> {
    if (!input) return undefined;
    if (typeof input === 'string') return input;
    if (typeof input === 'function' || input.format === 'svg') return input.src;
    const image = await getImage({ src: input, width: Math.min(width, input.width), format: 'webp' });
    return image.src;
}
