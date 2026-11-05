/**
 * 简历视图的前端逻辑：解锁加密的简历，分享简历链接，点开模糊显示的联系方式。
 *
 * 密文在构建时生成（src/utils/resume-crypto.ts）。解锁用的是一个 128 位密钥，有两种来源：
 * - 分享链接 # 后面的口令，就是这个密钥的 base64url，直接导入，不用等
 * - 访客手动输入的密码，用和构建时一样的 PBKDF2 参数派生出同一个密钥
 * 解开以后记在这个标签页里（只记口令，不记密码），分享出去的链接也只带口令。
 */

const STORAGE_KEY = 'vergil:resume-key';
/** 链接口令：128 位密钥的 base64url，正好 22 个字符 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** 当前页面解锁用的口令，分享链接要带上它；简历没加密时是 null */
let unlockedToken: string | null = null;
/** 每次进入页面重新绑定事件，离开时把上一页绑在 document 上的监听一起撤掉 */
let pageAbort: AbortController | null = null;

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 手动输入的密码换成链接口令，参数取自密文块上的 data-salt、data-iter */
async function passwordToToken(password: string, salt: string, iterations: number): Promise<string> {
    const { subtle } = window.crypto;
    const encoder = new TextEncoder();
    const base = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' }, base, 128);
    return toBase64Url(new Uint8Array(bits));
}

/** 全部解开才算成功，任何一块失败（口令不对）就返回 null */
async function openAll(blocks: HTMLElement[], token: string): Promise<string[] | null> {
    if (!TOKEN_PATTERN.test(token)) return null;
    try {
        const key = await window.crypto.subtle.importKey('raw', fromBase64(token), 'AES-GCM', false, ['decrypt']);
        return await Promise.all(
            blocks.map(async (block) => {
                const { iv = '', ciphertext = '' } = block.dataset;
                const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
                return new TextDecoder().decode(plain);
            })
        );
    } catch {
        return null;
    }
}

function readLinkToken(): string | null {
    return location.hash.slice(1) || null;
}

function readStoredToken(): string | null {
    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function storeToken(token: string | null) {
    try {
        if (token) sessionStorage.setItem(STORAGE_KEY, token);
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
}

/**
 * 把密文块换回原来的内容，和没加密时渲染出来的结构完全一样。
 * 这段 HTML 是构建时从简历 Markdown 渲染出来的，和不加密时直接输出的 HTML 是同一份；
 * AES-GCM 带校验，没有密钥的人改不了密文，链接里的 # 只提供密钥，不会变成页面内容
 */
function reveal(blocks: HTMLElement[], htmls: string[], lock: HTMLElement) {
    blocks.forEach((block, i) => {
        const template = document.createElement('template');
        template.innerHTML = htmls[i];
        block.replaceWith(template.content);
    });
    lock.remove();
    document.querySelectorAll('[data-resume-preview]').forEach((el) => el.remove());
    document.body.removeAttribute('data-resume-locked');
    delete document.body.dataset.resumeMode;
    applyPrintFooter();
}

/**
 * 预览：没有密码的访客先看删减版（构建时生成，遮住的内容不在页面里）。
 * 预览时点遮挡条或模糊的联系方式，回到输入密码页并提示
 */
function setupPreview(lock: HTMLElement, showForm: (message?: string) => void, input: HTMLInputElement, signal: AbortSignal) {
    const open = lock.querySelector('[data-resume-preview-open]');
    if (!open) return;
    const previews = () => Array.from(document.querySelectorAll<HTMLElement>('[data-resume-preview]'));

    const enter = () => {
        lock.hidden = true;
        previews().forEach((el) => (el.hidden = false));
        document.body.removeAttribute('data-resume-locked');
        document.body.dataset.resumeMode = 'preview';
        window.scrollTo(0, 0);
    };
    const exit = (message = '') => {
        previews().forEach((el) => (el.hidden = true));
        delete document.body.dataset.resumeMode;
        document.body.setAttribute('data-resume-locked', '');
        lock.hidden = false;
        showForm(message);
        window.scrollTo(0, 0);
        input.focus();
    };

    open.addEventListener('click', enter, { signal });
    document.addEventListener(
        'click',
        (event) => {
            if (document.body.dataset.resumeMode !== 'preview') return;
            const target = event.target as Element | null;
            if (target?.closest('[data-resume-preview-exit]')) {
                exit();
            } else if (target?.closest('.resume-redacted, .resume-masked')) {
                event.preventDefault();
                exit(lock.dataset.msgPreviewLocked);
            }
        },
        { signal }
    );
}

async function setupLock(signal: AbortSignal) {
    const lock = document.getElementById('resume-lock');
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-sealed]'));
    if (!lock || blocks.length === 0) return;

    const form = lock.querySelector<HTMLFormElement>('.resume-lock-form');
    const input = form?.querySelector<HTMLInputElement>('input[name="password"]');
    const error = lock.querySelector<HTMLElement>('.resume-lock-error');
    if (!form || !input || !error) return;

    const showForm = (message = '') => {
        lock.dataset.state = 'form';
        error.textContent = message;
    };

    // Web Crypto 只在 https 和 localhost 下可用，用局域网 IP 打开开发服务器时会走到这里
    if (!window.crypto?.subtle) {
        showForm(lock.dataset.msgInsecure);
        input.disabled = true;
        return;
    }

    const tryUnlock = async (token: string) => {
        const htmls = await openAll(blocks, token);
        if (!htmls || signal.aborted) return false;
        reveal(blocks, htmls, lock);
        unlockedToken = token;
        storeToken(token);
        return true;
    };

    setupPreview(lock, showForm, input, signal);

    form.addEventListener(
        'submit',
        async (event) => {
            event.preventDefault();
            const password = input.value;
            if (!password) return;
            lock.dataset.state = 'unlocking';
            const { salt = '', iter = '' } = blocks[0].dataset;
            if (await tryUnlock(await passwordToToken(password, salt, Number(iter)))) return;
            showForm(lock.dataset.msgWrong);
            input.select();
            input.focus();
        },
        { signal }
    );

    const fromLink = readLinkToken();
    const remembered = readStoredToken();
    if (fromLink && (await tryUnlock(fromLink))) return;
    if (remembered && remembered !== fromLink && (await tryUnlock(remembered))) return;
    if (signal.aborted) return;

    // 记住的口令解不开，说明博主换过密码，忘掉它
    if (remembered) storeToken(null);
    showForm(fromLink ? lock.dataset.msgInvalidLink : '');
}

/**
 * 加密简历的地址栏里放着口令（#口令），点目录、跳过导航这些页内锚点时只滚动，不改地址，
 * 否则 # 后面变成标题，刷新以后就解不开了；预览时也一样，免得刷新后把标题当成口令
 */
function keepTokenInUrl(signal: AbortSignal) {
    document.addEventListener(
        'click',
        (event) => {
            const previewing = document.body.dataset.resumeMode === 'preview';
            if ((!unlockedToken && !previewing) || event.defaultPrevented) return;
            const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
            if (!link) return;
            let id = link.getAttribute('href')!.slice(1);
            try {
                id = decodeURIComponent(id);
            } catch {}
            const target = document.getElementById(id);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView();
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        },
        { signal, capture: true }
    );
}

/**
 * 侧栏里模糊显示的信息（frontmatter 的 blur）：点一下才显示。
 * 模糊的是链接里的文字时，第一下只显示内容，不跟着链接拨号或发邮件
 */
function setupBlur(signal: AbortSignal) {
    const reveal = (event: Event) => {
        const target = event.target as Element | null;
        const host = target?.closest('a, [data-resume-blur]');
        const blurred = host?.matches('[data-resume-blur]') ? host : host?.querySelector('[data-resume-blur]');
        if (!blurred || blurred.hasAttribute('data-revealed')) return false;
        event.preventDefault();
        blurred.setAttribute('data-revealed', '');
        blurred.removeAttribute('title');
        return true;
    };
    document.addEventListener('click', reveal, { signal, capture: true });
    document.addEventListener(
        'keydown',
        (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && (event.target as Element | null)?.matches?.('[data-resume-blur][role="button"]')) {
                reveal(event);
            }
        },
        { signal }
    );
}

function shareUrl(): string {
    const base = location.origin + location.pathname;
    return unlockedToken ? `${base}#${unlockedToken}` : base;
}

function setupShare(signal: AbortSignal) {
    const root = document.getElementById('resume-share');
    const trigger = document.getElementById('resume-share-trigger');
    const panel = document.getElementById('resume-share-panel');
    const message = root?.querySelector<HTMLElement>('.resume-share-msg');
    const urlInput = root?.querySelector<HTMLInputElement>('.resume-share-url');
    if (!root || !trigger || !panel || !message || !urlInput) return;

    const close = () => {
        panel.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        panel.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
    };

    trigger.addEventListener(
        'click',
        async (event) => {
            event.stopPropagation();
            if (!panel.classList.contains('hidden')) {
                close();
                return;
            }
            const url = shareUrl();

            // 手机上优先用系统分享面板，能直接发到聊天软件；电脑上的系统分享不如复制链接顺手
            if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
                try {
                    await navigator.share({ title: document.title, url });
                    return;
                } catch (error) {
                    if ((error as DOMException).name === 'AbortError') return;
                }
            }

            let copied = false;
            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch {}
            urlInput.value = url;
            message.textContent = (copied ? root.dataset.msgCopied : root.dataset.msgManual) ?? '';
            open();
            if (!copied) {
                urlInput.focus();
                urlInput.select();
            }
        },
        { signal }
    );

    urlInput.addEventListener('focus', () => urlInput.select(), { signal });
    document.addEventListener(
        'click',
        (event) => {
            if (!root.contains(event.target as Node)) close();
        },
        { signal }
    );
    document.addEventListener(
        'keydown',
        (event) => {
            if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
                close();
                trigger.focus();
            }
        },
        { signal }
    );
}

/** CSS 字符串里的引号、反斜杠和尖括号转义掉，内容来自简历的 frontmatter */
function cssString(text: string): string {
    return `"${text.replace(/\\/g, '\\5C ').replace(/"/g, '\\22 ').replace(/</g, '\\3C ').replace(/\s+/g, ' ')}"`;
}

/**
 * 打印页脚左边的「姓名 · 标题」。姓名在加密的简历里要解锁后才有，所以在这里按页面上的内容补上
 */
function applyPrintFooter() {
    const name = Array.from(document.querySelectorAll('.resume-profile .resume-name'))
        .find((el) => !el.closest('[data-resume-preview]'))
        ?.textContent?.trim();
    const title = document.querySelector<HTMLElement>('.resume-paper')?.dataset.resumeTitle?.trim();
    document.getElementById('resume-print-footer')?.remove();
    if (!name) return;
    const style = document.createElement('style');
    style.id = 'resume-print-footer';
    style.textContent = `@media print { @page { @bottom-left { content: ${cssString(title ? `${name} · ${title}` : name)}; color: #9a9a9a; font-family: ui-sans-serif, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 7.5pt; } } }`;
    document.head.appendChild(style);
}

/**
 * 打印时按当前配色的亮色版本输出：暗色模式下打印前先去掉 dark，打印完再加回来。
 * 只在简历页生效，其他页面不受影响
 */
let restoreDark = false;
window.addEventListener('beforeprint', () => {
    const root = document.documentElement;
    restoreDark = Boolean(document.querySelector('.resume-paper')) && root.classList.contains('dark');
    if (restoreDark) root.classList.remove('dark');
});
window.addEventListener('afterprint', () => {
    if (restoreDark) document.documentElement.classList.add('dark');
    restoreDark = false;
});

document.addEventListener('astro:page-load', () => {
    pageAbort?.abort();
    pageAbort = new AbortController();
    unlockedToken = null;
    keepTokenInUrl(pageAbort.signal);
    setupBlur(pageAbort.signal);
    applyPrintFooter();
    setupShare(pageAbort.signal);
    setupLock(pageAbort.signal);
});
