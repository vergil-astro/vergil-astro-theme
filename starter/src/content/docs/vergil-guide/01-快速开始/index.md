---
title: 快速开始
order: 1
---

# 快速开始

本章将带你完成 Vergil 主题的安装、启动和第一篇内容的发布，以及之后怎么升级主题。

## 环境要求

你的电脑需要安装：

- [Node.js](https://nodejs.org/) 24 或更高版本，推荐装最新的 LTS（长期支持）版本
- [pnpm](https://pnpm.io/)：`vg init` 用它安装依赖
- [Git](https://git-scm.com/)：`vg init` 用它下载最新发布版的示例站，平时也用它做版本管理
- 一个代码编辑器（推荐 [VS Code](https://code.visualstudio.com/)）

## 安装步骤

### 1. 安装 vg 命令

vg 是 Vergil 的命令行工具。打开终端，全局装一次，以后建站、升级都用它：

```bash
npm install -g @vergil-astro/vergil-cli
```

### 2. 创建站点

```bash
vg init my-site
```

这一条命令会新建 `my-site` 文件夹，放入示例站，安装依赖，然后启动开发服务器。站点 `package.json` 里的 `name` 取的就是文件夹名，换成你想要的名字即可。

- 已经建好了一个空文件夹，进去直接运行 `vg init`，站点就建在当前文件夹。
- 只想先把文件放好：加 `--skip-install` 不装依赖，加 `--skip-serve` 不启动开发服务器。

命令执行后，终端会显示本地访问地址，通常是 `http://localhost:4321/`。用浏览器打开即可看到网站。

:::callout{type="tip"}
开发服务器支持**热更新**——你修改文件后，浏览器会自动刷新，无需手动重启。
:::

### 3. 之后每次启动

进到站点文件夹，启动开发服务器：

```bash
cd my-site
pnpm dev
```

## 变成你的站点（最少改动）

网站跑起来了，但展示的还是示例内容。下面这 5 项改完，网站就变成你的了。

### 1. 网站名和描述

打开 `src/data/config/identity.ts`，修改：

```typescript
export const siteInfo = {
    title: '我的博客',           // ← 改成你的网站名
    subtitle: '记录技术与生活',  // ← 改成你的副标题
    description: '...',          // ← 改成你的站点描述
};
```

### 2. 首页 Hero

同一个文件里，修改 `heroData`：

```typescript
export const heroData = {
    title: 'Hello，我是 **张三**!',
    text: '我是 **张三**，一名前端开发者...',
    // ...
};
```

### 3. 顶部导航菜单

打开 `src/data/config/nav.ts`，修改 `headerNavLinks`。去掉不想要的菜单项，添加你自己的：

```typescript
export const headerNavLinks = [
    {
        label: '博客',
        icon: 'book-open',
        children: [
            { label: '主页', href: '/', icon: 'home' },
            { label: '博客', href: '/blog', icon: 'file-text' },
            { label: '相册', href: '/albums', icon: 'image' },
        ]
    }
];
```

### 4. 底部链接

同一个文件里，修改 `footerNavLinks`（页脚导航）：

```typescript
export const footerNavLinks = [
    { text: '关于', href: '/about' },
    { text: '联系', href: '/contact' },
    { text: 'GitHub', href: 'https://github.com/yourname' },
];
```

### 5. 头像

把你的头像图片替换掉 `public/assets/site/avatar.jpg`，同名覆盖即可。

:::callout{type="tip"}
**改完这 5 项，刷新浏览器，网站就是你的了。**

其他配置（评论、搜索、开屏页、边栏等）都是可选的，之后有空再慢慢调整。
:::

## 项目结构

安装完成后，你会看到以下目录结构：

```
my-site/
├── src/
│   ├── assets/
│   │   ├── img/          ← 内容里的图片，用 @img/ 引用
│   │   └── videos/       ← 相册主题的背景视频
│   ├── content/          ← 所有内容文件放在这里
│   │   ├── blog/         ← 博客文章
│   │   ├── moments/      ← 瞬间（图文动态）
│   │   ├── thoughts/     ← 想法（碎片化笔记）
│   │   ├── albums/       ← 相册
│   │   ├── projects/     ← 项目展示
│   │   ├── docs/         ← 知识库
│   │   ├── pages/        ← 独立页面（关于、留言等）
│   │   ├── series/       ← 专栏
│   │   └── resume/       ← 简历
│   ├── data/
│   │   ├── site-config.ts     ← 站点配置入口（首次打开建议看这里）
│   │   └── config/            ← 按功能拆分的配置子模块
│   │       ├── nav.ts         ← 导航、视图、底部导航
│   │       ├── identity.ts    ← 网站信息、Hero、订阅
│   │       ├── features.ts    ← 搜索、评论、边栏等功能开关
│   │       ├── splash.ts      ← 开屏页
│   │       ├── links.ts       ← 网站卡片链接分组
│   │       └── fonts.ts       ← 字体注册表
│   └── content.config.ts      ← 一行，把主题包里的内容集合导出给 Astro
├── public/               ← 站点文件：favicon、头像、分享图、默认背景
├── astro.config.mjs      ← 接入主题，见下面「使用外部图片」里的示例
├── package.json          ← 依赖和全部命令
├── pnpm-workspace.yaml   ← pnpm 的安装脚本声明（allowBuilds），vg init 自动生成，要跟着提交
└── tsconfig.json
```

站点里只有内容和配置，没有 components、pages、styles、plugins 这些目录。页面、组件、样式、Markdown 插件都在主题包 `@vergil-astro/theme` 里，装在 `node_modules/@vergil-astro/theme/src/`，由 `astro.config.mjs` 里的 `vergil()` 接入。

:::callout{type="warn"}
不要直接改 `node_modules` 里的主题文件，升级或重新安装依赖时会被覆盖。想改组件、加指令，见 [定制与扩展](/docs/vergil-guide/08-定制与扩展/)。
:::

## 发布第一篇文章

在 `src/content/blog/` 目录下新建一个 Markdown 文件，文件名格式为 `文章标题.md`：

```markdown
---
title: 我的第一篇文章
publishDate: 2026-04-23
tags:
  - 随笔
---

这是我的第一篇博客文章。

Vergil 支持 Markdown 的所有基础语法：

- 列表项
- **加粗文字**
- [链接文字](https://example.com)

保存文件后，刷新浏览器即可看到新文章。
```

:::callout{type="info"}
文件头部的 `---` 之间的内容称为**信息头**，用于填写文章的标题、日期、标签等元信息。系统会读取这些信息来决定文章的展示方式。
:::

## 使用外部图片

文章中使用在线图片（如 `![描述](https://example.com/photo.jpg)`）时，需要先把域名加入白名单。主题默认已经放行 `images.unsplash.com`，其他域名加在站点 `astro.config.mjs` 的 `image.domains` 里，会和主题默认的合并：

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vergil from '@vergil-astro/theme';
import siteConfig from './src/data/site-config';

export default defineConfig({
    site: siteConfig.website,
    image: { domains: ['你的域名.com'] },
    integrations: [vergil({ config: siteConfig })],
});
```

不加白名单的外部图片会被拦截，只显示 alt 文字。本地图片（`public/` 目录下）无需配置。

## 常用命令

所有命令都写在站点 `package.json` 的 `scripts` 里，没有别的隐藏命令。除了 Astro 自己的几条，其余都交给 vg 执行。vg 是主题包的依赖，会跟着主题装进站点，所以在站点里 `pnpm reset` 和直接敲 `vg reset` 效果一样；全局装的 vg 在站点目录里运行时，也会转交给站点自己装的那一份，命令总是和站点用的主题版本对得上。

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器，改文件后浏览器自动刷新。`pnpm start` 等同 |
| `pnpm build` | 先运行 `images:organize` 整理图片，再构建站点，产物在 `dist/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm new` | 新建内容，如 `pnpm new post "我的第一篇文章"`；类型有 post、page、project、album、thought、moment、doc |
| `pnpm reset` | 清空演示内容，保留 Vergil 使用文档 |
| `pnpm reset:all` | 清空演示内容，连 Vergil 使用文档一起删 |
| `pnpm reset:dry` | 只列出 `reset` 会删除和重写哪些文件，不实际执行 |
| `pnpm images:organize` | 把内容引用的图片挪到 `src/assets/img/` 并改成 `@img/` 引用，见 [图片与静态资源](/docs/vergil-guide/03-基本创作/图片与静态资源/) |
| `pnpm images:expand` | 把 `@img/` 展开成相对路径，方便在 Typora、VS Code 里预览，`build` 时会自动改回 |
| `pnpm images:check` | 检查图片引用，报告失效引用、重复文件、大图，只读不写；有失效引用时返回失败，适合放进 CI |
| `pnpm directives:check` | 检查内容指令的写法：未知指令、写错的属性、没闭合的容器等，只读不写；有错误时返回失败。后面可以跟文件名只查这几篇，见 [AI 写作](/docs/vergil-guide/03-基本创作/ai写作/) |
| `pnpm directives:ref` | 输出内容指令参考，和当前主题版本一致；后面跟指令名只看这几个，如 `pnpm directives:ref callout` |
| `pnpm theme:upgrade` | 升级主题，等同 `vg upgrade`，见下面的 [升级主题](#升级主题) |
| `pnpm astro` | 直接调用 Astro 命令行，比如 `pnpm astro --help` |

## 升级主题

主题发了新版本，在站点目录里运行：

```bash
vg upgrade            # 或 pnpm theme:upgrade
vg upgrade --dry-run  # 只列出升级计划，什么都不改
vg upgrade --to 1.2.0 # 升到指定版本
```

`vg upgrade` 会依次做这些事：

1. 先到 npm 查最新版本。
2. 要求 git 工作区是干净的，然后新建分支 `vergil-upgrade/<版本>`。
3. 先按现状构建一次站点，留作对比。
4. 用站点自己的包管理器更新 `@vergil-astro/theme`。如果中间跨过有破坏性变更的版本，会自动执行对应的迁移。pnpm 站点还会同步新版本主题带来的安装脚本声明（allowBuilds）。
5. 再构建一次，逐页对比，列出有变化的页面。

确认没问题后在这个分支上提交。想撤销：

```bash
git switch - && git branch -D vergil-upgrade/<版本>
```

`vg init` 不会替你建 git 仓库。站点还不是 git 仓库时，`vg upgrade` 会跳过建分支直接升级，也就没法这样撤销，所以升级前先把站点放进 git 并提交一次。

站点里只放内容和配置，主题代码都在包里，所以升级不会和你的改动冲突。

也可以手动更新：`pnpm update @vergil-astro/theme`，只是没有前后对比。

:::callout{type="warn"}
不要用 `pnpm upgrade`。那是 pnpm 自带的命令（等同 `pnpm update`），不会运行站点里的脚本，所以站点脚本叫 `theme:upgrade`。
:::

## 下一步

- 了解如何[配置站点信息](/docs/vergil-guide/02-站点配置/)
- 了解有哪些[内容形式](/docs/vergil-guide/)可供选择
- 学习使用[内容指令](/docs/vergil-guide/03-基本创作/内容指令/)美化文章
