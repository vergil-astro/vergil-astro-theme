---
title: 开始01-十分钟创建个人网站
excerpt: 把 Vergil 装好、改成你的名字、清掉示例内容、部署上线。这一篇只做这一件事。
publishDate: '2026-09-10'
isFeatured: true
tags:
  - 上手指南
categories: ["Vergil", "上手"]
---

这一篇只做一件事：把站点跑起来，改成你的名字，发布上线。准备好 Node.js（推荐 22）、pnpm 和 Git 就可以开始。

## 跑起来

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[01]{title="克隆仓库"}

把主题克隆下来，目录名换成你想要的。

---

```bash title="终端"
git clone https://github.com/vergil-astro/vergil-astro-theme.git my-blog
cd my-blog
```
:::

:::grid{cols="2" bg="none" gap="16"}
:step-brackets[02]{title="安装并启动"}

启动后打开终端里给出的地址，通常是 `localhost` 的 4321 端口。改文件后浏览器会自动刷新。

---

```bash title="终端"
pnpm install
pnpm dev
```
:::

## 改成你的

打开 `src/data/config/`，下面几处改完，站点就是你的了：

| 改什么 | 在哪里 |
| --- | --- |
| 站点名、副标题、描述 | `identity.ts` 的 `siteInfo` |
| 首页顶部的介绍 | `identity.ts` 的 `heroData` |
| 顶部导航 | `nav.ts` 的 `headerNavLinks` |
| 页脚链接 | `nav.ts` 的 `footerNavLinks` |
| 头像 | 覆盖 `public/assets/site/avatar.jpg` |

评论、搜索、开屏页、侧栏这些都有默认值，以后有空再慢慢调。评论默认是关着的，想开的话，按文档 [评论系统](/docs/vergil-guide/06-功能配置/评论系统/) 接好 Giscus 或 Artalk 再打开。

## 清掉示例内容

仓库自带的文章、相册、示例知识库都是演示用的。先预演一遍，看看会删哪些，确认没问题再真正执行：

```bash title="终端"
pnpm reset:dry   # 只列出会删什么
pnpm reset       # 真正清理
```

:::callout{type="tip" title="文档会留下"}
`pnpm reset` 会保留站内的 Vergil 使用文档，那是你之后要查的东西。想一起删掉，用 `pnpm reset:all`。
:::

## 部署上线

把仓库推到 GitHub，然后在部署平台导入它。构建命令填 `pnpm build`，输出目录填 `dist`。以后每次推送，平台都会自动重新部署。

::::tabs
tab: Vercel

登录 Vercel，导入仓库，框架预设选 Astro，点部署。

tab: EdgeOne Pages

国内访问更快。在腾讯云 EdgeOne 控制台进入 Pages，导入仓库，框架预设选 Astro。用默认域名不需要备案。

tab: 其他平台

Netlify、GitHub Pages 同样可以，步骤见文档。

::::

各平台的详细步骤，见文档 [发布与部署](/docs/vergil-guide/07-发布与部署/)。

站点上线了，下一篇写第一篇文章。

:button[快速开始]{href="/docs/vergil-guide/01-快速开始/" color="accent" icon="lucide:zap"} :button[站点配置]{href="/docs/vergil-guide/02-站点配置/" color="blue" icon="lucide:settings"}
