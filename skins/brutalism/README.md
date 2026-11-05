# 粗野皮肤（brutalism）

Vergil 的报纸风新粗野主义皮肤：全部直角，纸面上只用 1px 黑色细框。容器只描边，可点击的东西再加一道不模糊的 4px 硬投影，悬停往左上抬，按下去沉进投影里。小标签、标签、按钮和表头用等宽大写，导航和目录的当前项是墨色实块，列表页标题是黑字加一道荧光笔似的高亮，分隔线是报纸上的双线。

规则主要照 Newsprint 设计规范，另外参考了 [superdesign 的 brutalism](https://superdesign.dev/styles/brutalism/components) 和 [BrutxUI](https://github.com/dev-snake/brutxui)，只借规则，不搬代码。皮肤不加载字体，等宽字取站点字体配置里的等宽字体。

## 安装

在站点目录里运行 `vg skin add brutalism`，安装和启用一步完成，`vg skin use brutalism` 设成默认皮肤。

不用 vg 的话，把这个目录复制到站点根目录的 `skins/brutalism/`，再在 `src/data/config/identity.ts` 里启用：

```ts
skins: ['brutalism'],
skin: 'brutalism',   // 想让访客默认看到粗野皮肤就加这一行
```

## 自带配色

| 面板上 | 配色 ID | 名称 | 说明 |
|------|------|------|------|
| M | `newsprint` | 报纸荧绿 | 推荐配色。纸白底、黑字黑框，荧光绿只做大块平涂；文字不用灰，正文链接带下划线 |

配色提供了 `--bg-pop` 和 `--pop-text`，粗野皮肤用它们画主按钮、页面标题的高亮、悬停底、进度条和悬浮按钮。别的配色不提供这两个变量时，皮肤退回强调色。

## 文件

```
skin.json            清单
skin.css             样式入口
styles/              按区域拆开的样式：基础、导航、正文、浮层、内容指令
schemes/             自带的配色
```

外观接口版本：1。格式和可以依赖的挂钩见 Vergil 文档「皮肤与配色接口」。
