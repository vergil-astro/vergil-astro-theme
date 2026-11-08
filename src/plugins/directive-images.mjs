/**
 * Let Astro process local images inside content directives too.
 *
 * Directive plugins build components as HTML strings, so Astro can't see the <img> tags inside and outputs their paths as-is.
 * The approach here: while building the HTML, leave a placeholder marker for each local image (@img/ or a relative path),
 * then split the HTML at the markers and swap in real Markdown image nodes. Astro then handles them like
 * ![](...): it resolves the path, compresses to WebP and writes width and height, keeping other <img> attributes as-is.
 *
 * External links and site paths starting with / need no processing; they are still output as <img> strings, with safeUrl filtering out addresses like javascript:.
 *
 * Usage:
 *   const images = createDirectiveImages();
 *   html += images.img(src, { class: 'md-image-img', alt, loading: 'lazy' });
 *   node.children = images.toNodes(html);
 */

import { safeUrl } from './directives/shared.mjs';

function escapeAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Local images that Astro should process: the @img/ alias or a relative path */
export function isLocalImage(src) {
    if (!src) return false;
    if (src.startsWith('@img/')) return true;
    // URLs with a scheme (http:, data:, javascript:, etc.), site paths starting with /, and # anchors are not local files
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('/') || src.startsWith('#')) return false;
    return true;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/**
 * Icon-like attributes (the icon of buttons, quote blocks and titles) may be an image path, an icon name or text,
 * so only values starting with @img/, or starting with ./ or ../ and having an image extension, count as local images
 */
export function isLocalImageFile(value) {
    if (!value) return false;
    if (value.startsWith('@img/')) return true;
    return /^\.{1,2}\//.test(value) && IMAGE_EXT.test(value.split(/[?#]/)[0]);
}

export function createDirectiveImages() {
    const pending = [];
    const marker = (i) => `\u0000vergil-img:${i}\u0000`;

    return {
        /** Generate an <img>. alt in attrs is handled separately; the other attributes are written to the <img> as-is */
        img(src, attrs = {}) {
            const { alt = '', ...rest } = attrs;
            if (!isLocalImage(src)) {
                const extra = Object.entries(rest)
                    .filter(([, v]) => v !== undefined && v !== null && v !== false)
                    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
                    .join('');
                return `<img src="${escapeAttr(safeUrl(src))}" alt="${escapeAttr(alt)}"${extra} />`;
            }
            pending.push({ src, alt, attrs: rest });
            return marker(pending.length - 1);
        },

        /** Split the HTML into nodes: placeholder markers become image nodes, the rest stays HTML */
        toNodes(html) {
            if (pending.length === 0) return [{ type: 'html', value: html }];
            const nodes = [];
            const parts = html.split(/\u0000vergil-img:(\d+)\u0000/);
            parts.forEach((part, i) => {
                if (i % 2 === 0) {
                    if (part) nodes.push({ type: 'html', value: part });
                    return;
                }
                const { src, alt, attrs } = pending[Number(part)];
                const { class: className, ...props } = attrs;
                const hProperties = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== false));
                if (className) hProperties.className = String(className).split(/\s+/).filter(Boolean);
                nodes.push({ type: 'image', url: src, alt, data: { hProperties } });
            });
            return nodes;
        }
    };
}
