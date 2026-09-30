---
title: 开始04-组织内容，换个样子
excerpt: 文章多起来以后，用分类、标签、专栏让读者找得到；再换一套配色、皮肤和侧栏，让站点更像你。
publishDate: '2026-09-16'
tags:
  - 上手指南
categories: ["Vergil", "上手"]
---

## 让读者找得到

文章多起来之后，Vergil 给你四种组织方式，各管一件事：

| 方式 | 一篇能有几个 | 回答的问题 |
| --- | --- | --- |
| 分类 | 一组，可以多级 | 这篇属于哪个领域 |
| 标签 | 多个 | 这篇提到了什么 |
| 专栏 | 一个 | 这篇在哪个系列里、排第几 |
| 归档 | 自动 | 这篇是什么时候写的 |

**分类要少。** 五到八个就够，多了等于没分。

**标签可以多。** 文章右侧栏的「相关文章」就是按共同标签找出来的，这个专栏的四篇都打了「上手指南」，所以它们互相出现在对方的相关文章里。

**专栏讲顺序。** 你正在读的就是一个专栏，文章底部有上一篇和下一篇。专栏的文章可以收进一个目录，这个专栏就是这样放的：

```
src/content/series/搭建你的第一个站点.md    ← 专栏定义，写了 dir: 搭建你的第一个站点
src/content/blog/搭建你的第一个站点/
├── 01-run-in-ten-minutes.md
├── 02-first-post.md
├── 03-directives-in-writing.md
└── 04-organize-and-style.md
```

目录里的文章自动属于这个专栏，不用逐篇写 `series`，目录名也不会出现在文章地址里。

一个实用建议：先只用分类，等文章攒到二三十篇、能看出主题聚集的时候，再回头补标签。

:button[分类]{href="/categories/" color="accent" icon="lucide:folder"} :button[标签]{href="/tags/" color="blue" icon="lucide:tag"} :button[专栏]{href="/series/" color="purple" icon="lucide:library"} :button[归档]{href="/archives/" color="cyan" icon="lucide:archive"}

## 换个样子

### 配色

12 套配色，每套都单独调过暗色模式。访客点右上角的主题图标就能切换，选择会记在浏览器里。你现在就可以试试，这篇文章会跟着变。

### 皮肤

皮肤管的是形状和质感：圆角多大、按钮什么样、卡片靠投影还是描边。颜色仍然来自配色，所以任何皮肤都能配任何配色。皮肤由你在配置里选定：

```ts title="src/data/config/identity.ts"
export const siteInfo = {
    // ...
    skin: 'island',   // 默认是 'default'，'island' 是大圆角的海岛风
};
```

### 视图

同一篇文章可以用不同方式读。[极简模式](/views/minimal/blog/04-organize-and-style/) 隐藏两侧的栏，只留正文，文章上方工具栏的「沉浸」按钮就能进入；[简历页](/views/resume/) 是一个独立的个人介绍视图。

### 侧栏

首页右侧的欢迎卡片、热力图、精选文章、标签云都是可插拔的组件，按你想要的顺序排在数组里：

```ts title="src/data/config/features.ts"
export const sidebar = {
    left: ['recentPosts', 'siteInfo'],
    right: ['welcome', 'heatmap', 'featured', 'tags', 'notice'],
};
```

文章的文件头里写 `isFeatured: true`，它就会出现在首页和文章页右侧栏的「精选文章」里。

这个专栏到这里就结束了。之后遇到具体问题，查文档就好：

:button[内容组织]{href="/docs/vergil-guide/03-基本创作/内容组织/" color="accent" icon="lucide:folder-tree"} :button[配色方案]{href="/docs/vergil-guide/02-站点配置/配色方案/" color="blue" icon="lucide:palette"} :button[界面皮肤]{href="/docs/vergil-guide/02-站点配置/界面皮肤/" color="purple" icon="lucide:brush"} :button[视图系统]{href="/docs/vergil-guide/04-进阶创作/视图系统/" color="cyan" icon="lucide:layout-template"} :button[边栏配置]{href="/docs/vergil-guide/06-功能配置/边栏配置/" color="green" icon="lucide:panel-right"}
