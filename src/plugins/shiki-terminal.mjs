import { visit, SKIP } from 'unist-util-visit';

const copyIconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';

function parseHighlight(raw) {
    if (!raw) return new Set();
    const set = new Set();
    raw.split(',').forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
            for (let i = start; i <= end; i++) if (!isNaN(i)) set.add(i);
        } else {
            const n = parseInt(part.trim(), 10);
            if (!isNaN(n)) set.add(n);
        }
    });
    return set;
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const readAttr = (meta, name) => meta.match(new RegExp(`${name}=["']([^"']+)["']`))?.[1];

// 所有 ``` 代码块默认都套上 mac 窗口外观（三个圆点 + 标题栏 + 复制按钮）。
// shell 语言额外按终端处理：识别 "$" 命令、显示提示符、只复制命令。
// 不套窗口的情况：markdown 示例（保持原来的渲染）、写了 no-title 的、代码面板里的（面板自己有标签和复制按钮）
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'fish']);
const PLAIN_LANGS = new Set(['markdown', 'md', 'mdx']);
const LANG_NAMES = {
    ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX',
    json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', html: 'HTML', css: 'CSS', scss: 'SCSS',
    astro: 'Astro', vue: 'Vue', svelte: 'Svelte', py: 'Python', python: 'Python', go: 'Go', rs: 'Rust', rust: 'Rust',
    java: 'Java', kt: 'Kotlin', kotlin: 'Kotlin', swift: 'Swift', objc: 'Objective-C', c: 'C', cpp: 'C++',
    cs: 'C#', csharp: 'C#', php: 'PHP', rb: 'Ruby', ruby: 'Ruby', sql: 'SQL', http: 'HTTP', env: '.env',
    diff: 'Diff', dockerfile: 'Dockerfile', xml: 'XML', graphql: 'GraphQL', lua: 'Lua', dart: 'Dart', text: 'Text',
    bash: 'Bash', sh: 'Shell', shell: 'Shell', zsh: 'Zsh', console: 'Console', fish: 'Fish',
};

const inPanel = (parent) => String(parent?.data?.hProperties?.class || '').includes('md-directive-panel');

export function remarkTerminal() {
    return (tree) => {
        visit(tree, 'code', (node, index, parent) => {
            const meta = node.meta || '';
            const lang = (node.lang || '').toLowerCase();
            if (!parent || PLAIN_LANGS.has(lang) || /(^|\s)no-title(\s|$)/.test(meta) || inPanel(parent)) return;

            const isShell = SHELL_LANGS.has(lang);
            const title = readAttr(meta, 'title') || LANG_NAMES[lang] || node.lang || '';
            const uid = `term-${Math.random().toString(36).slice(2, 7)}`;
            let copyText = node.value;
            let extraMeta = ' codewin';

            // shell 代码里带 "$ " 的行算命令：第一个没被转义的 "$"（后面跟空格或在行尾）之前的内容整体当作这一行的路径，
            // 不再解析其中的符号，`~/www$ git pull` 的路径就是 `~/www`；"$" 前面什么都没有时路径是 `~`。
            // 输出行里要显示 "$" 就写成 "\$"，渲染时去掉反斜杠；命令本身里的 "\$" 是 shell 语法，原样保留。
            // 复制按钮只复制命令；一行命令都没有时整段原样复制
            if (isShell) {
                const prompts = {};
                const commands = [];
                const lines = node.value.split('\n').map((line, i) => {
                    const match = line.match(/^((?:[^$\\]|\\.)*?)\$(?: (.*))?$/);
                    if (!match) return line.replace(/\\\$/g, '$');
                    const command = match[2] ?? '';
                    prompts[i + 1] = match[1].replace(/\\\$/g, '$') || '~';
                    commands.push(command);
                    return command;
                });
                node.value = lines.join('\n');
                copyText = node.value;
                if (commands.length > 0) {
                    extraMeta += ` prompts="${encodeURIComponent(JSON.stringify(prompts))}"`;
                    copyText = commands.join('\n');
                }
            }
            node.meta = `${meta}${extraMeta}`;

            const wrapperProps = { class: 'md-terminal' };
            if (meta.includes('linenos')) {
                wrapperProps['data-line-numbers'] = 'true';
            }

            const wrapper = {
                type: 'container',
                data: { hName: 'div', hProperties: wrapperProps },
                children: [
                    { type: 'html', value: `<div class="md-terminal-header"><span class="md-terminal-title">${escapeHtml(title)}</span><button class="md-copy-btn md-terminal-copy" data-copy-target="${uid}" aria-label="Copy" title="Copy">${copyIconSvg}</button></div><div class="md-terminal-body">` },
                    node,
                    { type: 'html', value: `<textarea id="${uid}" class="md-copy-source" readonly style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">${escapeHtml(copyText)}</textarea></div>` }
                ]
            };

            parent.children[index] = wrapper;
            // 包好的节点不再往里走，避免访问到包在里面的同一个代码块
            return [SKIP, index + 1];
        });
    };
}

// 命令行前面的提示符：路径 + ❯。单独成一个元素，不可选中，也不进复制内容
function promptNode(path) {
    return {
        type: 'element',
        tagName: 'span',
        properties: { className: ['md-terminal-prompt'], 'aria-hidden': 'true' },
        children: [
            { type: 'element', tagName: 'span', properties: { className: ['md-terminal-prompt-path'] }, children: [{ type: 'text', value: path }] },
            { type: 'element', tagName: 'span', properties: { className: ['md-terminal-prompt-symbol'] }, children: [{ type: 'text', value: '❯' }] },
        ],
    };
}

export function transformerTerminal() {
    return {
        name: 'terminal',
        pre(node) {
            const metaRaw = this.options.meta?.__raw || '';
            if (!/(^|\s)codewin(\s|$)/.test(metaRaw)) return;
            if (node.properties && node.properties.style) {
                let style = String(node.properties.style);
                style = style.replace(/white-space:\s*pre-wrap;?/g, '');
                style = style.replace(/word-wrap:\s*break-word;?/g, '');
                style = style.replace(/overflow-x:\s*auto;?/g, '');
                node.properties.style = style.trim();
            }
        },
        line(node, line) {
            const metaRaw = this.options.meta?.__raw || '';
            if (!/(^|\s)codewin(\s|$)/.test(metaRaw)) return;
            if (metaRaw.includes('linenos')) {
                node.properties['data-line'] = String(line);
            }
            const prompts = readAttr(metaRaw, 'prompts');
            const path = prompts ? JSON.parse(decodeURIComponent(prompts))[line] : undefined;
            if (path !== undefined) {
                this.addClassToHast(node, 'line-command');
                node.children = [promptNode(path), ...(node.children || [])];
            }
            const highlightMatch = metaRaw.match(/highlight=["']([^"']+)["']/);
            if (highlightMatch) {
                const set = parseHighlight(highlightMatch[1]);
                if (set.has(line)) {
                    this.addClassToHast(node, 'line-highlight');
                }
            }
            if (!node.children || node.children.length === 0) {
                node.children = [{ type: 'text', value: ' ' }];
            }
        },
        code(node) {
            const metaRaw = this.options.meta?.__raw || '';
            if (!/(^|\s)codewin(\s|$)/.test(metaRaw)) return;
            node.children = node.children.filter(child => !(child.type === 'text' && child.value === '\n'));
        }
    };
}
