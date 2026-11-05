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

/** schema 里 module 对应的容器指令渲染函数；image、photo、inline 由别的插件或 textDirective 处理 */
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

/** 容器指令名 → 渲染函数，从 schema 生成；schema 里没登记的指令不会被渲染 */
const containerHandlers = new Map(
    DIRECTIVES.filter((d) => CONTAINER_PROCESSORS[d.module]).map((d) => [d.name, CONTAINER_PROCESSORS[d.module]]),
);

/** 本页 :::sites 里没填 cover 的站点，先在线查好 og:image，渲染时当默认封面 */
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

/** 没人认领的行内指令（比如 a:b 里被当成指令的 :b）还原成原文，否则会渲染成空 div，吞掉文字还截断段落 */
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
