---
title: 开始02-写第一篇文章
excerpt: 新建一个 Markdown 文件，写好文件头，放上配图、横幅和分享封面。这篇文章本身就是照着这些写的。
publishDate: '2026-09-12'
banner: '@img/blog/02-first-post/road.jpg'
tags:
  - 上手指南
categories: ["Vergil", "上手"]
seo:
  image:
    src: '@img/blog/02-first-post/laptop.jpg'
    alt: 打开的笔记本电脑
---

在 `src/content/blog/` 下新建一个 `.md` 文件就是一篇文章，文件名就是文章地址。比如 `my-first-post.md`，发布后的地址是 `/blog/my-first-post/`。

## 文件头

文件开头两行 `---` 之间是文件头，写标题、日期、标签这些信息：

```markdown title="src/content/blog/my-first-post.md"
---
title: 我的第一篇文章
excerpt: 一句话摘要，显示在文章列表里
publishDate: 2026-09-30
tags:
  - 随笔
categories: ["生活", "旅行"]
banner: '@img/blog/my-first-post/banner.jpg'
seo:
  image:
    src: '@img/blog/my-first-post/cover.jpg'
draft: true
---

正文从这里开始。
```

只有 `title` 和 `publishDate` 是必填的，其余按需要写：

- **`banner`** 是横幅，显示在文章顶部，也是文章列表里的配图。这篇文章顶部那条公路就是。
- **`seo.image`** 是分享封面，把文章链接贴到社交平台时显示这张图。这篇用的是一台笔记本电脑，贴一下链接就能看到。
- **`categories`** 可以写多级，越靠前层级越高。这篇写的是 `["Vergil", "上手"]`，在 [分类页](/categories/) 能看到它挂在「Vergil」下面。
- **`draft: true`** 表示草稿，构建时会跳过。写完改成 `false` 或者删掉这一行，就发布了。

## 放配图

**写的时候不用管图片放在哪。** 用 Typora 粘贴一张截图、从文件夹拖进一张照片，编辑器生成什么路径都可以，横幅和分享封面也一样。剩下的交给 `pnpm build`，它在构建前后会做两件事：

1. **整理**：先运行 `pnpm images:organize`，把文章引用的图片挪到 `src/assets/img/blog/<文章名>/`，路径改成 `@img/...`。已经在这个目录里的图不会再挪；同一张图被几篇文章引用时，会给每篇复制一份。它不会删除任何图片。
2. **优化**：构建时每张图都压缩成 WebP，写好宽高，默认懒加载，输出到 `/_astro/`，文件名里带内容哈希。

整理之后，正文里的图片是这样写的：

![打开的笔记本电脑](@img/blog/02-first-post/laptop.jpg)

```markdown
![打开的笔记本电脑](@img/blog/02-first-post/laptop.jpg)
```

`@img/` 的写法和文章放在哪个目录无关。这篇在专栏目录 `搭建你的第一个站点/` 下，图片目录却只取文件名，所以是 `blog/02-first-post/`，不带专栏名。

:::callout{type="warn" title="文件头里的 @img/ 要加引号"}
YAML 里以 `@` 开头的值必须加引号，写成 `banner: '@img/...'`，否则构建会报错。`pnpm images:organize` 改写时会自动加上。
:::

还有两个命令，平时用得到：

- **`pnpm images:expand`**：把 `@img/` 展开成相对路径，Typora、VS Code 就能预览图片了。下次 `pnpm build` 会自动改回来。
- **`pnpm images:check`**：只读体检，报告失效的引用、重复的文件和超过 500KB 的大图，适合放进 CI。

完整的目录规则、支持 `@img/` 的字段、整理时的各种特殊情况，见文档 [图片与静态资源](/docs/vergil-guide/03-基本创作/图片与静态资源/)，其中 [写作时不用管规则](/docs/vergil-guide/03-基本创作/图片与静态资源/#写作时不用管规则) 和 [用 `pnpm images:organize` 整理](/docs/vergil-guide/03-基本创作/图片与静态资源/#用-pnpm-imagesorganize-整理) 两节讲的就是上面这套机制。

想看横幅、多张照片、拍摄参数放在一起是什么样子，可以看 [山里的一个周末](/blog/a-weekend-in-the-mountains/)，那是一篇完整的普通文章。

## 常见问题

:::folding{title="图片直接放在 public/ 行不行"}
能显示，但不会被压缩，也不会写宽高。`public/` 只放头像、分享图这类站点本身的文件。文章引用了 `public/` 下的图也没关系，`pnpm build` 前会自动挪进 `src/assets/img/`。
:::

:::folding{title="外链图片显示不出来"}
外链图片的域名要先加进 `astro.config.mjs` 的 `image.domains` 白名单，默认只放行了 `images.unsplash.com`。
:::

完整的字段列表和图片规则见文档：

:button[博客写作]{href="/docs/vergil-guide/03-基本创作/内容形式/博客写作/" color="accent" icon="lucide:pen-line"} :button[图片与静态资源]{href="/docs/vergil-guide/03-基本创作/图片与静态资源/" color="blue" icon="lucide:image"} :button[内容字段参考]{href="/docs/vergil-guide/03-基本创作/内容字段参考/" color="purple" icon="lucide:list"}

文章写好了，下一篇让它不只是文字。
