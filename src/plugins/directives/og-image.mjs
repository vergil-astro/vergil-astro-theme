/**
 * :::sites 的默认封面：站点自己给社交分享准备的 og:image。
 *
 * 构建时读一次站点首页的 HTML，取出 og:image（没有就取 twitter:image）的地址，
 * 渲染时直接用这个远程地址，不下载图片、不生成文件。取不到就返回空，调用方退回截图服务。
 * 同一个地址在一次构建（或一次 dev 会话）里只请求一次。
 */

const TIMEOUT_MS = 5000;
// og:image 写在 <head> 里，读前 256KB 足够，不必下载整页
const MAX_BYTES = 256 * 1024;
// 有些站点会拦掉不像浏览器的请求
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const cache = new Map();

function decodeEntities(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&#x2F;/gi, '/');
}

/** 从 HTML 里取某个 meta 的 content，property 和 name 两种写法、属性前后顺序都认 */
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
        // 相对地址按最终落地页补全；只接受 http(s)，别的一律不用
        const image = new URL(raw, res.url || pageUrl);
        return image.protocol === 'https:' || image.protocol === 'http:' ? image.href : '';
    } catch {
        return '';
    }
}

/** 取站点的 og:image 地址，取不到返回空字符串，不会抛错 */
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
