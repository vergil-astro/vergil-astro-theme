import { getIconSvg, encryptPrivateContent, serializeToHtml, escapeHtml } from './shared.mjs';

/* 中文兜底文案；实际文案由 processPrivateDirective 的 options.i18n.private 传入，跟着站点语言走 */
const I18N_FALLBACK = {
    title: '私密内容',
    desc: '这部分内容已加密，输入密码后查看',
    hint: (hint) => `提示：${hint}`,
    placeholder: '输入密码',
    showPassword: '显示密码',
    view: '查看',
    error: '密码不对，再试一次',
    unlocked: '已解锁',
    lockAgain: '重新锁定',
    missingPassword: '请提供 password 属性，例如 :::private{password="xxx"}',
};

export function processPrivateDirective(node, options = {}) {
    const i = { ...I18N_FALLBACK, ...(options.i18n?.private || {}) };
    const attrs = node.attributes || {};
    const password = attrs.password || '';
    const hint = attrs.hint || '';

    if (!password) {
        node.data = { hName: 'div', hProperties: { class: 'md-directive md-directive-private' } };
        node.children = [{ type: 'html', value: `<p style="color:var(--text-secondary);font-size:0.875rem;">${escapeHtml(i.missingPassword)}</p>` }];
    } else {
        const html = serializeToHtml(node.children);
        const encrypted = encryptPrivateContent(html, password);

        const lockIcon = getIconSvg('lucide:lock', 20);
        const unlockIcon = getIconSvg('lucide:lock-open', 20);
        const eyeOpenIcon = getIconSvg('lucide:eye', 16);
        const eyeCloseIcon = getIconSvg('lucide:eye-off', 16);

        const hintHtml = hint ? `<div class="md-private-hint">${escapeHtml(i.hint(hint))}</div>` : '';

        node.data = { hName: 'div', hProperties: { class: 'md-directive md-directive-private', 'data-payload': encrypted } };
        node.children = [{
            type: 'html',
            value: `<div class="md-private-locked"><div class="md-private-icon">${lockIcon}</div><div class="md-private-title">${escapeHtml(i.title)}</div><div class="md-private-desc">${escapeHtml(i.desc)}</div>${hintHtml}<div class="md-private-form"><div class="md-private-input-wrap"><input type="password" class="md-private-input" placeholder="${escapeHtml(i.placeholder)}" /><button type="button" class="md-private-toggle" aria-label="${escapeHtml(i.showPassword)}"><span class="md-private-eye-open">${eyeOpenIcon}</span><span class="md-private-eye-close">${eyeCloseIcon}</span></button></div><button type="button" class="md-private-btn">${escapeHtml(i.view)}</button></div><div class="md-private-error">${escapeHtml(i.error)}</div></div><div class="md-private-unlocked" style="display:none"><div class="md-private-header"><span class="md-private-status">${unlockIcon}<span>${escapeHtml(i.unlocked)}</span></span><button type="button" class="md-private-lock-btn">${lockIcon}<span>${escapeHtml(i.lockAgain)}</span></button></div><div class="md-private-content"></div></div>`
        }];
    }
}
