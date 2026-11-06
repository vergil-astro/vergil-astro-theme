---
title: AI 写作
order: 3
---

# AI 写作

Vergil 的内容指令是一套写法固定的 Markdown 语法，AI 助手很擅长在这种规则明确的写法里生成内容。主题为此准备了两样东西：

- 两个命令：`pnpm directives:ref` 输出指令参考，`pnpm directives:check` 检查指令写法。它们读的是站点所装主题里的同一份指令清单（主题的 `src/plugins/directives/schema.mjs`），所以总是和你正在用的主题版本一致。
- 一个 agent 插件 [vergil-skills](https://github.com/vergil-astro/vergil-skills)：装好后，助手会用指令帮你排版、起稿；每改完一篇文章自动跑一遍检查，有错当场改掉。

## 安装插件

在 Claude Code 里运行：

```text
/plugin marketplace add vergil-astro/vergil-skills
/plugin install vergil@vergil-astro
```

装好后在站点根目录直接说要做什么：

> 帮我排版一下 `src/content/blog/my-post.md`

> 根据这些笔记写一篇从 Hexo 迁到 Astro 的文章

排版时不改你的原话，只整理结构、加上合适的指令；起稿时成稿带 `draft: true`，等你看过再发布。

### 自动检查

插件带一个钩子：助手每次写入或修改 `src/content/` 下的 `.md` 文件，都会对这个文件跑一遍 `directives:check`。有错误时，错误连同行号交回给助手，它会接着改。

项目里没有 `directives:check` 这个命令时（比如主题版本较旧），钩子什么也不做。

### 其他 AI 工具

Codex CLI、Cursor 等工具可以用 Skills CLI 只装写作技能：

```bash
npx skills add vergil-astro/vergil-skills
```

这样装没有自动检查，技能会要求助手写完后自己跑一遍 `pnpm directives:check`。

## 查指令：directives:ref

```bash
pnpm directives:ref               # 全部指令，外加写法规则、代码块和数学公式
pnpm directives:ref callout tabs  # 只看这几个指令
```

每个指令列出写法、示例、属性表（取值、默认值、是否必填）、正文格式和容易写错的地方。

## 检查写法：directives:check

```bash
pnpm directives:check                         # 检查 src/content 下所有 Markdown
pnpm directives:check src/content/blog/a.md   # 只查这一篇
```

输出的样子：

```text
src/content/blog/a.md:12:1  错误  callout 的 type="warning" 只能是 "info"、"tip"、"warn"、"danger"
src/content/blog/a.md:30:1  错误  video 至少要写 src、bilibili、youtube 中的一个
src/content/blog/a.md:41:1  提示  timeline 的这一项没有 `|`，会被丢掉：没有竖线

检查了 1 个文件：2 个错误，1 个提示。
```

| 级别 | 能查出的问题 |
| --- | --- |
| 错误 | 未知指令，或写法不对，比如把 video 写成了单行 `::video` |
| 错误 | 冒号后多了空格、属性没写在一行，导致这一行没被识别成指令 |
| 错误 | 未知属性、取值不在范围内、缺少必填属性 |
| 错误 | 容器没有闭合 |
| 错误 | 正文格式不对：echart 不是合法 JSON、表格缺少必需的列、tabs 里没有 `tab:` 行 |
| 提示 | 会被忽略或丢掉的内容，比如没有正文的指令里写了正文 |

有错误时命令返回失败，可以放进 CI。行内指令只检查已有的名字，正文里的 `10:30`、`a:b` 不会被误报。

## 新增或修改指令

新增或修改指令是改主题本身，要在主题仓库里做，改好提 PR，见[在哪里改](/docs/vergil-guide/08-定制与扩展/#在哪里改)。

指令清单在主题的 `src/plugins/directives/schema.mjs`。容器指令按清单里的 `module` 分发到对应的渲染代码，清单里没登记的指令不会被渲染。改指令时先改清单，再改渲染代码和 [内容指令](/docs/vergil-guide/03-基本创作/内容指令/) 文档，参考、检查和插件就都跟着变了。
