import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';

const parser = remark().use(remarkDirective).use(remarkMath);

/** Count Chinese characters and English words in prose, excluding code blocks
 * and Markdown metadata (URLs, directive attributes, formatting, etc.).
 * Inline code remains part of the prose. Shared by statistics and reading time.
 */
export function countWords(content: string): number {
    const tree = parser.parse(content);
    let total = 0;
    visit(tree, (node) => {
        if (node.type !== 'text' && node.type !== 'inlineCode') return;
        total += (node.value.match(/[\u4e00-\u9fa5]/g) || []).length;
        total += (node.value.match(/[a-zA-Z]+/g) || []).length;
    });
    return total;
}
