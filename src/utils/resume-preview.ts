/**
 * Preview version of an encrypted resume, generated at build time. It is what visitors without the password see after clicking "Preview", so it sits in the page as plaintext:
 * content to hide is deleted right here and replaced with redaction bars, so the original text is not in the page and visitors cannot reveal it.
 */
import { parse, HTMLElement } from 'node-html-parser';

/** Estimate text width (em) so redaction bars roughly match the original length: full-width Chinese characters are about 1em, Latin letters and digits about 0.55em */
function textWidth(text: string): number {
    let width = 0;
    for (const ch of text) {
        if (/[⺀-鿿豈-﫿＀-￯]/.test(ch)) width += 1;
        else if (/\s/.test(ch)) width += 0.3;
        else width += 0.55;
    }
    return Math.max(1.5, Math.round(width * 10) / 10);
}

/** Give each part of "Company · Title" its own redaction bar and keep the separator dot, so it still reads as two pieces of info */
function bars(text: string): string {
    return text
        .split(/\s*·\s*/)
        .filter(Boolean)
        .map((part) => `<span class="resume-redact" style="width:${textWidth(part)}em"></span>`)
        .join('<span class="resume-redact-sep">·</span>');
}

/** Plain text of a heading, without the hover anchor (whose aria-label also contains the heading text) */
function headingText(el: HTMLElement): string {
    el.querySelectorAll('.heading-anchor').forEach((a) => a.remove());
    return el.text.trim();
}

/**
 * In the sections listed in sections (matched by ## heading text), replace each entry heading (###) with redaction bars.
 * The whole h3 is replaced, and its original id (generated from the heading text) is removed with it
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
