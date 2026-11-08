import { visit } from 'unist-util-visit';

/**
 * Add clickable anchor links to post headings.
 *
 * Astro generates ids for h2-h4 itself, but with no clickable link readers can't copy the URL of a section.
 * This appends an <a> to the end of the heading, transparent by default and shown only on hover or keyboard focus.
 * rehype-autolink-headings is not used, to avoid an extra dependency for a small feature.
 */
const LINK_ICON = {
    type: 'element',
    tagName: 'svg',
    properties: {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '0.8em',
        height: '0.8em',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
    },
    children: [
        { type: 'element', tagName: 'path', properties: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }, children: [] },
        { type: 'element', tagName: 'path', properties: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }, children: [] },
    ],
};

function textOf(node) {
    let out = '';
    visit(node, 'text', (t) => {
        out += t.value;
    });
    return out.trim();
}

export function rehypeHeadingAnchors(options = {}) {
    const anchorTo = options.anchorTo ?? '链接到：';
    const anchorToHeading = options.anchorToHeading ?? '链接到此标题';
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (!/^h[2-4]$/.test(node.tagName)) return;

            const id = node.properties?.id;
            if (!id) return;

            // Skip if already added, so repeated runs don't stack anchors
            if (node.children?.some((c) => c.type === 'element' && c.properties?.className?.includes?.('heading-anchor'))) {
                return;
            }

            const label = textOf(node);
            node.children.push({
                type: 'element',
                tagName: 'a',
                properties: {
                    href: `#${id}`,
                    className: ['heading-anchor'],
                    'aria-label': label ? `${anchorTo}${label}` : anchorToHeading,
                },
                children: [structuredClone(LINK_ICON)],
            });
        });
    };
}
