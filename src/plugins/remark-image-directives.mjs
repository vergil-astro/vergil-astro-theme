import { visit } from 'unist-util-visit';
import { createDirectiveImages, isLocalImage } from './directive-images.mjs';

const DOWNLOAD_ICON = `<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M561.00682908 685.55838913a111.03077546 111.03077546 0 0 1-106.8895062 0L256.23182837 487.72885783a55.96309219 55.96309219 0 0 1 79.13181253-79.18777574L450.70357448 523.88101491V181.55477937a55.96309219 55.96309219 0 0 1 111.92618438 0v344.06109173l117.07478902-117.07478901a55.96309219 55.96309219 0 0 1 79.13181252 79.18777574zM282.81429711 797.1487951h447.70473912a55.96309219 55.96309219 0 0 1 0 111.92618438H282.81429711a55.96309219 55.96309219 0 0 1 0-111.92618438z"></path></svg>`;

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function extractGalleryImages(children) {
    const images = [];

    function walk(nodes) {
        for (const child of nodes || []) {
            if (child.type === 'image') {
                images.push({ alt: child.alt || '', src: child.url || '' });
            } else if (child.type === 'text' || child.type === 'inlineCode') {
                const text = child.value || '';
                const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
                let m;
                while ((m = imgRegex.exec(text)) !== null) {
                    images.push({ alt: m[1], src: m[2] });
                }
            } else if (child.children) {
                walk(child.children);
            }
        }
    }

    walk(children);
    return images;
}

function renderImageDirective(attrs, images) {
    const src = attrs.src || '';
    const alt = attrs.alt || '';
    const width = attrs.width || '';
    const height = attrs.height || '';
    const bg = attrs.bg || '';
    const padding = attrs.padding || '';
    const download = attrs.download || '';
    const ratio = attrs.ratio || '';
    const fancybox = attrs.fancybox;

    let imgStyle = '';
    if (width) imgStyle += `width:${width};`;
    if (height) imgStyle += `height:${height};`;

    const useZoom = fancybox !== 'false' && fancybox !== false;

    // Build image with loading placeholder wrapper
    let imgWrap = '<div class="md-image-img-wrap">';
    // Loading shimmer placeholder
    imgWrap += '<div class="md-image-loading"></div>';
    // Actual image with onerror fallback
    imgWrap += images.img(src, {
        class: 'md-image-img',
        alt,
        'data-zoomable': useZoom ? '1' : undefined,
        style: imgStyle && !ratio ? imgStyle : undefined,
        loading: 'lazy',
        decoding: 'async',
        // 处理函数定义在 BaseHead 里；调用不带引号，本地图片交给 Astro 后属性才不会被转义坏
        onerror: 'vergilImgError(this)',
        onload: 'vergilImgLoad(this)'
    });
    imgWrap += '</div>';

    let inner = imgWrap;

    if (download && download.length > 0) {
        const href = download === 'true' ? src : download;
        const downloadAttr = alt ? ` download="${escapeHtml(alt)}"` : '';
        if (isLocalImage(href)) {
            // 本地图片构建后才有真实地址，点击时取页面上这张图实际加载的地址
            inner += `<a class="md-image-download" target="_blank"${downloadAttr} href="#" onclick="this.href=this.closest('.md-image-bg').querySelector('img').currentSrc">${DOWNLOAD_ICON}</a>`;
        } else {
            inner += `<a class="md-image-download" target="_blank"${downloadAttr} href="${escapeHtml(href)}">${DOWNLOAD_ICON}</a>`;
        }
    }

    let bgStyle = '';
    if (bg) bgStyle += `background:${bg};`;
    if (padding) bgStyle += `padding:${padding};`;
    if (ratio) {
        bgStyle += `aspect-ratio:${ratio};`;
        if (imgStyle) bgStyle += imgStyle;
    } else if (imgStyle) {
        bgStyle += 'width:100%;';
    }

    let wrap = '<div class="md-directive md-directive-image">';
    wrap += `<div class="md-image-bg"${bgStyle ? ` style="${bgStyle}"` : ''}>`;
    wrap += inner;
    wrap += '</div>';

    if (alt) {
        wrap += `<div class="md-image-meta"><span class="md-image-caption">${escapeHtml(alt)}</span></div>`;
    }
    wrap += '</div>';

    return wrap;
}

export function remarkImageDirectives() {
    return (tree) => {
        // ── Container directive: image (treat as block image, ignore children) ──
        // Handles ::image{...} when parsed as containerDirective without closing :::
        visit(tree, 'containerDirective', (node) => {
            if (node.name !== 'image') return;
            const attrs = node.attributes || {};
            const images = createDirectiveImages();
            const html = renderImageDirective(attrs, images);
            // Replace the entire container with just the rendered image,
            // discarding any accidentally-swallowed children
            node.data = { hName: 'div', hProperties: {} };
            node.children = images.toNodes(html);
        });

        // ── Leaf directive: image ──
        visit(tree, 'leafDirective', (node) => {
            if (node.name !== 'image') return;
            const attrs = node.attributes || {};
            const images = createDirectiveImages();
            const html = renderImageDirective(attrs, images);
            node.data = { hName: 'div', hProperties: {} };
            node.children = images.toNodes(html);
        });

        // ── Text directive: image ──
        const imageTextDirectives = [];
        visit(tree, 'textDirective', (node, index, parent) => {
            if (node.name === 'image') {
                imageTextDirectives.push({ node, index, parent });
            }
        });

        for (const { node, index, parent } of imageTextDirectives) {
            const attrs = node.attributes || {};
            const images = createDirectiveImages();
            const html = renderImageDirective(attrs, images);
            const nodes = images.toNodes(html);

            if (nodes.length > 1) {
                // 含本地图片：保留成带子节点的元素，让里面的图片节点交给 Astro 处理
                if (parent && parent.type === 'paragraph') {
                    parent.data = { hName: 'div', hProperties: {} };
                    parent.children = nodes;
                } else {
                    node.data = { hName: 'span', hProperties: {} };
                    node.children = nodes;
                }
                continue;
            }

            if (parent && parent.type === 'paragraph') {
                // Replace the entire paragraph with raw html block
                Object.assign(parent, {
                    type: 'html',
                    value: html,
                });
                delete parent.children;
            } else {
                Object.assign(node, {
                    type: 'html',
                    value: html,
                });
                delete node.name;
                delete node.attributes;
                delete node.children;
                delete node.data;
            }
        }

        // ── Container directive: gallery / banner ──
        visit(tree, 'containerDirective', (node) => {
            const name = node.name;
            const attrs = node.attributes || {};

            const directiveImages = createDirectiveImages();

            if (name === 'gallery') {
                const layout = attrs.layout || 'grid';
                const size = attrs.size || 'm';
                const ratio = attrs.ratio || '';

                const images = extractGalleryImages(node.children);

                let html = `<div class="md-directive md-directive-gallery md-gallery-${layout}"`;
                const dataAttrs = [];
                if (size) dataAttrs.push(`data-gallery-size="${escapeHtml(size)}"`);
                if (ratio) dataAttrs.push(`data-gallery-ratio="${escapeHtml(ratio)}"`);
                if (dataAttrs.length) html += ' ' + dataAttrs.join(' ');
                html += '>';

                images.forEach((img) => {
                    html += `<div class="md-gallery-cell">`;
                    html += directiveImages.img(img.src, { alt: img.alt, 'data-zoomable': '1', loading: 'lazy', decoding: 'async' });
                    if (img.alt) {
                        html += `<div class="md-gallery-meta"><span class="md-gallery-caption">${escapeHtml(img.alt)}</span></div>`;
                    }
                    html += '</div>';
                });

                html += '</div>';

                node.data = { hName: 'div', hProperties: {} };
                node.children = directiveImages.toNodes(html);

            } else if (name === 'banner') {
                const title = attrs.title || '';
                const subtitle = attrs.subtitle || '';
                const bg = attrs.bg || '';
                const avatar = attrs.avatar || '';
                const link = attrs.link || '';

                let html = '<div class="md-directive md-directive-banner">';
                if (bg) {
                    html += directiveImages.img(bg, { class: 'md-banner-bg', alt: '', loading: 'lazy' });
                }
                html += '<div class="md-banner-content">';
                html += '<div class="md-banner-top">';
                if (!link) {
                    html += `<button class="md-banner-back" onclick="window.history.back()"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.354 12.354a.5.5 0 01-.708 0l-4-4a.5.5 0 010-.708l4-4a.5.5 0 11.708.708L6.707 8l3.647 3.646a.5.5 0 010 .708z"/></svg></button>`;
                } else {
                    html += '<div></div>';
                }
                html += '</div>'; // end top

                html += '<div class="md-banner-bottom">';
                if (avatar) {
                    html += directiveImages.img(avatar, { class: 'md-banner-avatar', alt: '', loading: 'lazy' });
                }
                if (title || subtitle) {
                    html += '<div class="md-banner-text">';
                    if (title) html += `<div class="md-banner-title">${escapeHtml(title)}</div>`;
                    if (subtitle) html += `<div class="md-banner-subtitle">${escapeHtml(subtitle)}</div>`;
                    html += '</div>';
                }
                html += '</div>'; // end bottom
                html += '</div>'; // end content

                if (link) {
                    html += `<a class="md-banner-link" href="${escapeHtml(link)}" target="_blank"></a>`;
                }
                html += '</div>';

                node.data = { hName: 'div', hProperties: {} };
                node.children = directiveImages.toNodes(html);
            }
        });
    };
}
