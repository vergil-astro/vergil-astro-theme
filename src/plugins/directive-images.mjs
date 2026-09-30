/**
 * 让内容指令里的本地图片也交给 Astro 处理。
 *
 * 指令插件把组件拼成 HTML 字符串，Astro 看不到里面的 <img>，路径原样输出。
 * 这里的做法：拼 HTML 时，本地图片（@img/ 或相对路径）先留一个占位标记，
 * 最后把 HTML 在标记处切开，换成真正的 Markdown 图片节点。Astro 会像处理
 * ![](...) 一样解析路径、压缩成 WebP、写入宽高，<img> 上的其他属性原样保留。
 *
 * 外链和 / 开头的站点路径不需要处理，照旧输出 <img> 字符串，并经过 safeUrl 过滤掉 javascript: 这类地址。
 *
 * 用法：
 *   const images = createDirectiveImages();
 *   html += images.img(src, { class: 'md-image-img', alt, loading: 'lazy' });
 *   node.children = images.toNodes(html);
 */

import { safeUrl } from './directives/shared.mjs';

function escapeAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 需要交给 Astro 处理的本地图片：@img/ 别名或相对路径 */
export function isLocalImage(src) {
    if (!src) return false;
    if (src.startsWith('@img/')) return true;
    // 带协议的（http:、data:、javascript: 等）、/ 开头的站点路径、# 锚点都不是本地文件
    if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('/') || src.startsWith('#')) return false;
    return true;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/**
 * 图标一类的属性（按钮、引用块、标题的 icon）既可能是图片路径，也可能是图标名或文字，
 * 只有 @img/ 开头，或 ./ ../ 开头且是图片扩展名的才当本地图片
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
        /** 生成一个 <img>。attrs 里的 alt 单独处理，其余属性原样写到 <img> 上 */
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

        /** 把 HTML 切成节点：占位标记处换成图片节点，其余部分保持 HTML */
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
