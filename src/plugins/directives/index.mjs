/**
 * Remark content directives main entry.
 *
 * Aggregates all directive processors into a unified remark plugin.
 */
import { visit } from 'unist-util-visit';
import { processInlineDirective } from './inline.mjs';
import { processBlockDirective } from './blocks.mjs';
import { processOkrDirective } from './okr.mjs';
import { processCardDirective } from './cards.mjs';
import { processMediaDirective } from './media.mjs';
import { processPrivateDirective } from './private.mjs';
import { processChartDirective } from './charts.mjs';
import { processCalendarDirective } from './calendar.mjs';
import { processStoryDirective } from './story.mjs';
import { processMindDirective } from './mind.mjs';
import { getOgImage } from './og-image.mjs';
import { DIRECTIVES } from './schema.mjs';

/** Container directive renderers for each module in the schema; image, photo and inline are handled by other plugins or textDirective */
const CONTAINER_PROCESSORS = {
    blocks: processBlockDirective,
    okr: processOkrDirective,
    cards: processCardDirective,
    media: processMediaDirective,
    charts: processChartDirective,
    calendar: processCalendarDirective,
    private: processPrivateDirective,
    story: processStoryDirective,
    mind: processMindDirective,
};

/** Container directive name → renderer, generated from the schema; directives not registered in the schema are not rendered */
const containerHandlers = new Map(
    DIRECTIVES.filter((d) => CONTAINER_PROCESSORS[d.module]).map((d) => [d.name, CONTAINER_PROCESSORS[d.module]]),
);

/** For sites in this page's :::sites without a cover, look up their og:image online first and use it as the default cover when rendering */
async function resolveSiteCovers(tree, links) {
    const urls = new Set();
    visit(tree, 'containerDirective', (node) => {
        if (node.name !== 'sites') return;
        const items = (links && links[node.attributes?.group]) || [];
        items.forEach((item) => {
            if (!item.cover && item.url) urls.add(item.url);
        });
    });
    const entries = await Promise.all([...urls].map(async (url) => [url, await getOgImage(url)]));
    return new Map(entries.filter(([, image]) => image));
}

/** Restore unclaimed inline directives (e.g. the :b in a:b parsed as a directive) to their original text; otherwise they render as an empty div, swallowing the text and cutting the paragraph short */
function restoreAsText(node, file) {
    const { start, end } = node.position ?? {};
    const value = start && end ? String(file.value).slice(start.offset, end.offset) : `:${node.name}`;
    Object.assign(node, { type: 'text', value });
    delete node.name;
    delete node.attributes;
    delete node.children;
}

export function remarkContentDirectives(options = {}) {
    return async (tree, file) => {
        const ogImages = await resolveSiteCovers(tree, options.links);
        options = { ...options, ogImages };

        visit(tree, 'textDirective', (node, _index, parent) => {
            processInlineDirective(node, parent);
            if (!node.data?.hName) restoreAsText(node, file);
        });

        visit(tree, 'containerDirective', (node) => {
            containerHandlers.get(node.name)?.(node, options);
        }, true);
    };
}
