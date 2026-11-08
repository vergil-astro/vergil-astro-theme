/**
 * Default cover for :::sites: the og:image the site itself provides for social sharing.
 *
 * At build time, read the site's home page HTML once and extract the og:image URL (or twitter:image if there is none).
 * Rendering uses this remote URL directly, without downloading the image or generating files. If none is found, return empty and the caller falls back to the screenshot service.
 * Each URL is requested only once per build (or per dev session).
 */

const TIMEOUT_MS = 5000;
// og:image lives in <head>, so reading the first 256KB is enough; no need to download the whole page
const MAX_BYTES = 256 * 1024;
// Some sites block requests that don't look like they come from a browser
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const cache = new Map();

function decodeEntities(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&#x2F;/gi, '/');
}

/** Get a meta tag's content from HTML; accepts both the property and name forms, in either attribute order */
function findMeta(html, key) {
    const tags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of tags) {
        const nameMatch = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
        if (!nameMatch || nameMatch[1].toLowerCase() !== key) continue;
        const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
        if (contentMatch && contentMatch[1].trim()) return decodeEntities(contentMatch[1].trim());
    }
    return '';
}

async function readHead(res) {
    if (!res.body) return (await res.text()).slice(0, MAX_BYTES);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    return html;
}

async function lookup(pageUrl) {
    try {
        const res = await fetch(pageUrl, {
            headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
            redirect: 'follow',
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        if (!res.ok || !/html/i.test(res.headers.get('content-type') || '')) return '';
        const html = await readHead(res);
        const raw = findMeta(html, 'og:image') || findMeta(html, 'twitter:image');
        if (!raw) return '';
        // Resolve relative URLs against the final landing page; accept only http(s) and reject everything else
        const image = new URL(raw, res.url || pageUrl);
        return image.protocol === 'https:' || image.protocol === 'http:' ? image.href : '';
    } catch {
        return '';
    }
}

/** Get the site's og:image URL; returns an empty string if not found and never throws */
export function getOgImage(pageUrl) {
    let url;
    try {
        url = new URL(pageUrl);
    } catch {
        return Promise.resolve('');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return Promise.resolve('');
    if (!cache.has(url.href)) cache.set(url.href, lookup(url.href));
    return cache.get(url.href);
}
