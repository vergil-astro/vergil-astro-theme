/**
 * 加密简历的预览版，构建时生成。没有密码的访客点「预览」看到的就是它，所以它是明文放在页面里的：
 * 要遮住的内容在这里直接删掉，换成遮挡条，页面里没有原文，访客也就展开不了。
 */
import { parse, HTMLElement } from 'node-html-parser';

/** 估算文字宽度（em），让遮挡条的长短大致和原文相当：中文全角约 1em，英文数字约 0.55em */
function textWidth(text: string): number {
    let width = 0;
    for (const ch of text) {
        if (/[⺀-鿿豈-﫿＀-￯]/.test(ch)) width += 1;
        else if (/\s/.test(ch)) width += 0.3;
        else width += 0.55;
    }
    return Math.max(1.5, Math.round(width * 10) / 10);
}

/** 「公司 · 职位」分段各给一根遮挡条，保留中间的分隔点，看得出是两段信息 */
function bars(text: string): string {
    return text
        .split(/\s*·\s*/)
        .filter(Boolean)
        .map((part) => `<span class="resume-redact" style="width:${textWidth(part)}em"></span>`)
        .join('<span class="resume-redact-sep">·</span>');
}

/** 标题的纯文本，去掉悬停出现的锚点（锚点的 aria-label 里也带着标题原文） */
function headingText(el: HTMLElement): string {
    el.querySelectorAll('.heading-anchor').forEach((a) => a.remove());
    return el.text.trim();
}

/**
 * 把 sections 里列出的分组（按 ## 标题的文字匹配）中，每段经历的标题（###）换成遮挡条。
 * 换掉的是整个 h3，原来的 id（由标题文字生成）也一起去掉
 */
export function redactSections(html: string, sections: string[], label: string): string {
    if (sections.length === 0) return html;
    const targets = new Set(sections.map((s) => s.trim()));
    const root = parse(html);
    let current: string | null = null;
    for (const node of [...root.childNodes]) {
        if (!(node instanceof HTMLElement)) continue;
        const tag = node.tagName.toLowerCase();
        if (tag === 'h2') {
            current = headingText(node);
        } else if (tag === 'h3' && current !== null && targets.has(current)) {
            node.replaceWith(`<h3 class="resume-redacted" role="img" aria-label="${label}">${bars(headingText(node))}</h3>`);
        }
    }
    return root.toString();
}
