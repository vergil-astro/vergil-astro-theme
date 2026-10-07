---
title: 欢迎使用 Vergil
excerpt: 写 Markdown，剩下的交给主题。几分钟看完 Vergil 能做什么、为什么值得用，以及从哪里开始。
publishDate: '2026-09-28'
isFeatured: true
banner: '@img/blog/welcome-to-vergil/desk.jpg'
tags:
  - 上手指南
categories: ["Vergil"]
seo:
  image:
    src: '@img/blog/welcome-to-vergil/features.jpg'
    alt: Vergil 的四种页面效果
---

Vergil 是一套基于 Astro 的内容站点框架。博客、图文动态、项目、知识库、相册放在同一个站点里，提示框、时间线、图表这些排版都写成 Markdown 指令，不用写组件，也不用碰 CSS。

你现在看到的这个站点，就是用 Vergil 搭的。

![Vergil 的四种页面](@img/blog/welcome-to-vergil/features.jpg)

四格分别是：文章里的折叠块与时间线、Golden 主题的相册、带目录树的知识库、按分类筛选的极简模式。

## 为什么用它

### 只写 Markdown

51 个内容指令覆盖排版、提示、媒体、图表和计划，写法都一样：三个冒号开头，三个冒号结尾。下面三块就是直接写在这篇文章里的，切到「写法」看源码。

::::tabs
tab: 效果

:::callout{type="tip" title="提示框"}
读者容易略过的信息，放进提示框。
:::

:::timeline
- 第 1 天 | 跑起来 | 克隆仓库，运行 `pnpm dev`
- 第 2 天 | 改成自己的 | 站点名、头像、导航
- 第 3 天 | 写第一篇 | 写完推送，自动部署上线
:::

:::mermaid
flowchart LR
    A[写 Markdown] --> B[pnpm build] --> C[静态站点] --> D[部署到任意平台]
:::

tab: 写法

`````markdown
:::callout{type="tip" title="提示框"}
读者容易略过的信息，放进提示框。
:::

:::timeline
- 第 1 天 | 跑起来 | 克隆仓库，运行 `pnpm dev`
- 第 2 天 | 改成自己的 | 站点名、头像、导航
- 第 3 天 | 写第一篇 | 写完推送，自动部署上线
:::

:::mermaid
flowchart LR
    A[写 Markdown] --> B[pnpm build] --> C[静态站点] --> D[部署到任意平台]
:::
`````

::::

### 一篇文章，三种读法

默认视图带着左右侧栏和目录，方便在站内跳转。极简模式去掉两侧，只留正文，文章上方工具栏的「沉浸」按钮一点就进。简历页是一个独立的个人介绍视图，可以直接打印成 PDF。

::::tabs
tab: 默认视图

![默认视图](@img/blog/welcome-to-vergil/view-default.jpg)

tab: 极简模式

![极简模式](@img/blog/welcome-to-vergil/view-minimal.jpg)

tab: 简历页

![简历页](@img/blog/welcome-to-vergil/view-resume.jpg)

::::

:button[用极简模式看这篇]{href="/views/minimal/blog/welcome-to-vergil/" color="accent" icon="lucide:book-open"} :button[打开简历页]{href="/views/resume/" color="blue" icon="lucide:user"}

### 配色随手换，皮肤藏在配置里

**配色**有 12 套，每套都单独调过暗色模式。访客点右上角的主题图标就能切换，现在就可以试试。

**皮肤**管的是形状和质感：圆角多大、按钮什么样、顶栏贴边还是悬浮。它没有给访客的切换入口，由你在配置里选定。除了默认皮肤，Vergil 还藏了一套「海岛」：大圆角、胶囊按钮、悬浮的顶栏、铺一层波点底纹，默认配一套暖奶油色。

::::tabs
tab: 海岛皮肤

![海岛皮肤](@img/blog/welcome-to-vergil/view-island.jpg)

tab: 默认皮肤

![默认皮肤](@img/blog/welcome-to-vergil/view-default.jpg)

::::

换成海岛皮肤只要改一行：

```ts title="src/data/config/identity.ts"
export const siteInfo = {
    // ...
    skin: 'island',   // 默认是 'default'
};
```

### 开箱即用

深色模式、全文搜索（按 :kbd[Ctrl+K] 试试）、RSS、站点地图、中英文界面都是现成的；评论接好 Giscus 或 Artalk 就能打开。文章里的图片构建时自动压缩成 WebP、写好宽高。构建产物是纯静态文件，Vercel、Netlify、EdgeOne Pages、GitHub Pages 都能直接部署。

还有一些锦上添花的功能，在配置里打开开关就有：

::::tabs
tab: 开屏页

![开屏页](@img/blog/welcome-to-vergil/feat-splash.jpg)

首页的全屏轮播背景，你打开这个站时看到的就是它。[怎么配置 →](/docs/vergil-guide/06-功能配置/开屏页/)

tab: 站点助理

![站点助理](@img/blog/welcome-to-vergil/feat-agent.jpg)

打开后，页面左下角会出现一个站点助理，按你所在的页面说一句话，还可以换成 Rive 或 Live2D 模型。它默认是关着的，台词改成你自己的口吻再打开。[怎么配置 →](/docs/vergil-guide/06-功能配置/站点助理/)

tab: 浮动播放器

![浮动播放器](@img/blog/welcome-to-vergil/feat-audio.jpg)

把当前页面里的音频收进右下角的播放器，点顶栏的音乐按钮打开，可以固定展开。[怎么配置 →](/docs/vergil-guide/06-功能配置/浮动音频播放器/)

tab: 在线工具箱

![在线工具箱](@img/blog/welcome-to-vergil/feat-tools.jpg)

JSON 解析、文本对比、图片转 WebP，全部在浏览器里运行，数据不会上传。[打开工具箱](/tools/)

::::

另外还有 [标签页](/tags/) 底部可以拖着转的 3D 标签星球，以及接入 Umami 后的 [站内访问统计](/docs/vergil-guide/06-功能配置/数据统计/)。

## 站里都有什么

点缩略图直接进入对应的页面。

:::grid{cols="3" gap="12"}
[![博客](@img/blog/welcome-to-vergil/page-blog.jpg)](/blog/)

**[博客](/blog/)**

长文章，用专栏、分类、标签组织。

---

[![图文动态](@img/blog/welcome-to-vergil/page-moments.jpg)](/moments/)

**[图文动态](/moments/)**

随手拍、短句子，像发朋友圈。

---

[![想法](@img/blog/welcome-to-vergil/page-thoughts.jpg)](/thoughts/)

**[想法](/thoughts/)**

碎片笔记，按时间串起来。

---

[![项目](@img/blog/welcome-to-vergil/page-projects.jpg)](/projects/)

**[项目](/projects/)**

作品展示，带技术栈和链接。

---

[![知识库](@img/blog/welcome-to-vergil/page-docs.jpg)](/docs/)

**[知识库](/docs/)**

成体系的文档，带目录树和上下篇。

---

[![相册](@img/blog/welcome-to-vergil/page-albums.jpg)](/albums/)

**[相册](/albums/)**

[黑金](/albums/album-1/) 和 [四季](/albums/album-2/) 两套主题，灯箱浏览，显示拍摄参数。
:::

## 三步开始

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[01]{title="跑起来"}

克隆仓库，装好依赖，启动开发服务器。

---

```bash title="终端"
git clone https://github.com/vergil-astro/vergil-astro-theme.git my-blog
cd my-blog
pnpm install
pnpm dev
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[02]{title="改成你的"}

站点名、首页介绍、导航、页脚、头像，改完这 5 处就是你的站点。

---

```ts title="src/data/config/identity.ts"
export const siteInfo = {
    title: '我的博客',
    subtitle: '记录技术与生活',
    // ...
};
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[03]{title="清掉示例，开始写"}

先预演看看会删什么，再一键清掉演示内容，然后写你的第一篇。

---

```bash title="终端"
pnpm reset:dry
pnpm reset
```
:::

每一步怎么做，专栏 [搭建你的第一个站点](/series/搭建你的第一个站点/) 会一篇一篇带你走完，从 [第一篇](/blog/01-run-in-ten-minutes/) 开始。

## 遇到问题

所有功能的完整用法都在站内文档里，GitHub 上可以提问题。

:button[快速开始]{href="/docs/vergil-guide/01-快速开始/" color="accent" icon="lucide:zap"} :button[内容指令]{href="/docs/vergil-guide/03-基本创作/内容指令/" color="blue" icon="lucide:puzzle"} :button[站点配置]{href="/docs/vergil-guide/02-站点配置/" color="purple" icon="lucide:settings"} :button[GitHub]{href="https://github.com/vergil-astro/vergil-astro-theme" color="cyan" icon="lucide:github"}
