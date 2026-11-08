/**
 * Frontend logic for the resume view: unlock an encrypted resume, share the resume link, and reveal blurred contact info.
 *
 * The ciphertext is generated at build time (src/utils/resume-crypto.ts). Unlocking uses a 128-bit key from one of two sources:
 * - the token after # in a share link, which is the key's base64url and is imported directly, with no wait
 * - a password the visitor types in, from which the same key is derived with the same PBKDF2 parameters as the build
 * Once unlocked, it is remembered in this tab (the token only, never the password), and shared links carry only the token.
 */

const STORAGE_KEY = 'vergil:resume-key';
/** Link token: the base64url of the 128-bit key, exactly 22 characters */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** Token that unlocked the current page, which share links must include; null when the resume is not encrypted */
let unlockedToken: string | null = null;
/** Events are rebound on every page entry; on leaving, the listeners the previous page bound on document are removed as well */
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

/** Turn a typed password into a link token, with parameters taken from data-salt and data-iter on the ciphertext block */
async function passwordToToken(password: string, salt: string, iterations: number): Promise<string> {
    const { subtle } = window.crypto;
    const encoder = new TextEncoder();
    const base = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' }, base, 128);
    return toBase64Url(new Uint8Array(bits));
}

/** Succeeds only if every block decrypts; if any block fails (wrong token), return null */
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
 * Swap the ciphertext blocks back to their original content, with exactly the same structure as an unencrypted render.
 * This HTML was rendered from the resume Markdown at build time and is the same HTML that is output directly without encryption;
 * AES-GCM is authenticated, so nobody without the key can alter the ciphertext, and the # in the link only supplies the key and never becomes page content
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
 * Preview: visitors without the password see the redacted version first (generated at build time; the hidden content is not in the page).
 * Clicking a redaction bar or a blurred contact while previewing returns to the password screen with a hint
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

    // Web Crypto is only available over https and on localhost; opening the dev server via a LAN IP ends up here
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

    // The remembered token no longer works, meaning the author changed the password, so forget it
    if (remembered) storeToken(null);
    showForm(fromLink ? lock.dataset.msgInvalidLink : '');
}

/**
 * An encrypted resume keeps the token in the address bar (#token), so in-page anchors such as the table of contents and the skip link only scroll and leave the URL alone;
 * otherwise the part after # would become a heading and the resume could not be unlocked after a refresh. The same goes for preview, so a refresh does not treat a heading as the token
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
 * Blurred info in the sidebar (frontmatter blur): revealed on click.
 * When the blurred text is inside a link, the first click only reveals it and does not follow the link to dial or send email
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

            // On phones prefer the system share sheet, which can send straight to chat apps; on desktop, copying the link is handier than the system share
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

/** Escape quotes, backslashes and angle brackets for a CSS string; the content comes from the resume frontmatter */
function cssString(text: string): string {
    return `"${text.replace(/\\/g, '\\5C ').replace(/"/g, '\\22 ').replace(/</g, '\\3C ').replace(/\s+/g, ' ')}"`;
}

/**
 * The "Name · Title" on the left of the print footer. In an encrypted resume the name only exists after unlocking, so it is filled in here from the page content
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
 * Print using the light variant of the current color scheme: in dark mode, remove dark before printing and add it back afterwards.
 * Only applies on the resume page; other pages are unaffected
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
