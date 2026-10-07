---
title: 开始03-让文章不只是文字
excerpt: 写文章时常遇到几种情况：先给结论、强调一个词、列待办、对比两段代码、推荐一个项目。每种情况都有一个指令，写在 Markdown 里就行。
publishDate: '2026-09-14'
tags:
  - 上手指南
categories: ["Vergil", "上手"]
---

:::note{title="先说结论"}
Vergil 有 50 个内容指令，日常写作常用的不到十个。这篇挑几种写作中最常遇到的情况，每种配一个指令，你看到的效果都是直接写在这篇文章里的。
:::

上面这块就是第一种情况：**开头先给结论**，用 `note` 高亮块。读者扫一眼就知道这篇讲什么，要不要往下读。

## 强调一个词

一句话里只有一个词最重要时，不用整句加粗，:mark[给它加个高亮]就够了。行内指令只有一个冒号：`:mark[文字]`。

## 列一份待办

写计划、写复盘时，用复选框比列表更直观：

:checkbox[读完这个专栏]{checked="true" color="green"}
:checkbox[写第一篇文章]{checked="true" color="green"}
:checkbox[给文章配上横幅]
:checkbox[推送上线]

## 对比两段代码

同一件事的两种写法，放进一个 `panel` 里并排对照，每段都能单独复制：

:::panel
```bash title="npm" right="传统"
npm install
npm run dev
```

```bash title="pnpm" right="推荐"
pnpm install
pnpm dev
```
:::

## 推荐一个开源项目

与其贴一个光秃秃的链接，不如放一张 GitHub 卡片，星标数和简介会自动拉取：

:::ghcard{type="repo" repo="vergil-astro/vergil-astro-theme"}
:::

## 让读者复制一行命令

读者要照着敲的命令，放进 `copy`，点一下就复制好了：

:::copy{label="创建站点"}
git clone https://github.com/vergil-astro/vergil-astro-theme.git my-blog
:::

## 别用太多

指令是为了让信息更好读，不是为了炫技。一篇文章里每隔两段就冒出一个彩色框，真正重要的内容反而会失去分量。拿不准的时候，先用普通的 Markdown 写，确实需要时再换成指令。

::::folding{title="看这篇文章的写法"}
`````markdown
:::note{title="先说结论"}
Vergil 有 50 个内容指令……
:::

一句话里只有一个词最重要时，:mark[给它加个高亮]就够了。

:checkbox[读完这个专栏]{checked="true" color="green"}
:checkbox[给文章配上横幅]

:::panel
```bash title="npm" right="传统"
npm install
```

```bash title="pnpm" right="推荐"
pnpm install
```
:::

:::ghcard{type="repo" repo="vergil-astro/vergil-astro-theme"}
:::

:::copy{label="创建站点"}
git clone https://github.com/vergil-astro/vergil-astro-theme.git my-blog
:::
`````
::::

每个指令的全部参数和更多用法见文档：

:button[内容指令总览]{href="/docs/vergil-guide/03-基本创作/内容指令/" color="accent" icon="lucide:puzzle"} :button[高亮块]{href="/docs/vergil-guide/03-基本创作/内容指令/内容展示/#高亮块note" color="blue"} :button[代码面板]{href="/docs/vergil-guide/03-基本创作/内容指令/内容展示/#代码面板panel" color="blue"} :button[GitHub 卡片]{href="/docs/vergil-guide/03-基本创作/内容指令/卡片与链接/#github-卡片ghcard" color="blue"} :button[复选框]{href="/docs/vergil-guide/03-基本创作/内容指令/文字与交互/#复选框checkbox" color="blue"}

下一篇讲文章多起来之后怎么组织，以及怎么把站点换成你喜欢的样子。
