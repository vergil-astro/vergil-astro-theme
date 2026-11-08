import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { t } from '../i18n';

/** Value of an imageOrPath frontmatter field: a path starting with / or an external URL, an image resolved by image(), or an SVG component */
export type ImageOrPath = string | ImageMetadata | ({ src: string } & ((...args: never[]) => unknown));

const IMG_ALIAS = '@img/';

/**
 * All images under src/assets/img/, for string paths that do not go through Astro content processing,
 * such as images in the moments JSON files.
 */
const imgModules = import.meta.glob<{ default: ImageOrPath }>('/src/assets/img/**/*.{png,jpg,jpeg,webp,gif,avif,svg}', {
    eager: true
});

function lookupImgAlias(src: string): ImageOrPath {
    const image = imgModules[`/src/assets/img/${decodeURI(src.slice(IMG_ALIAS.length))}`]?.default;
    if (!image) throw new Error(t.build.imageNotFound(src));
    return image;
}

/**
 * Convert to a URL that can go straight into <img src>.
 * - Strings starting with @img/: find the matching image under src/assets/img/, then process it
 * - Other strings are returned as-is
 * - SVGs need no optimization and use their original URL (Astro parses SVGs into components, with the URL on their src)
 * - Other images are resized to width and converted to WebP
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
 * Replace ![](@img/...) paths in Markdown with real URLs, for moment bodies rendered with marked.
 * Syntax examples inside code blocks are left untouched.
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
