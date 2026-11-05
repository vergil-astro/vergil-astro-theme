/**
 * 内容指令清单：每个指令的写法、属性、正文格式和示例。
 *
 * 这是指令的唯一来源。渲染插件按 module 分发，`pnpm directives:check` 按它校验，
 * `pnpm directives:ref` 按它输出参考，vg 和 AI 写作插件也读这一份。
 * 文件只放数据，不引入任何依赖，脚本可以直接 import。
 *
 * 新增或修改指令：先改这里，再改 module 对应的渲染代码，最后改文档。
 */

/**
 * @typedef {object} AttrSpec
 * @property {'string' | 'enum' | 'list' | 'boolean' | 'number' | 'color'} type
 *   enum 只能取 values 之一；list 是逗号分隔的多个值，给了 values 就逐个校验；
 *   boolean 写 "true"/"false"，只写属性名等于 true；color 是颜色名或 CSS 色值
 * @property {string[]} [values]
 * @property {boolean} [required]
 * @property {string} [default]
 * @property {string} [pattern] 值必须匹配的正则（源码字符串）
 * @property {string} [format] pattern 的人话说明，校验报错时显示
 * @property {string} desc
 */

/**
 * @typedef {object} DirectiveSpec
 * @property {string} name
 * @property {string} category
 * @property {string} module 负责渲染的模块：blocks、okr、cards、media、charts、calendar、private、story、mind、inline 在 directives/ 下，image 和 photo 是独立的 remark 插件
 * @property {('container' | 'leaf' | 'text')[]} forms 允许的写法：`:::name` 容器、`::name` 单行、`:name[]` 行内
 * @property {string} summary
 * @property {Record<string, AttrSpec>} attrs
 * @property {string[][]} [oneOf] 每组里至少要写一个属性
 * @property {{ kind: 'markdown' | 'text' | 'none' | 'list' | 'table' | 'json' | 'images' | 'code', desc: string, columns?: string[], requiredColumns?: string[] }} [body]
 *   行内指令的 body 指方括号里的内容
 * @property {string[]} [notes] 容易写错的地方
 * @property {string} example
 */

export const CATEGORIES = ['结构排版', '内容展示', '媒体嵌入', '卡片与链接', '文字与交互', '图表可视化', '时间规划', '可视化叙事'];

/** 颜色名，shared.mjs 的 NAMED_COLORS */
export const NAMED_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan', 'accent'];

const ALIGN = { type: 'enum', values: ['left', 'center', 'right'], default: 'left', desc: '对齐方式' };
const IMAGE_SRC = '支持 `@img/`、相对路径和外链，本地图片构建时会被优化';
const color = (desc, def) => ({ type: 'color', desc, ...(def ? { default: def } : {}) });
const bool = (desc, def) => ({ type: 'boolean', desc, ...(def ? { default: def } : {}) });
const str = (desc, extra = {}) => ({ type: 'string', desc, ...extra });
const textColor = (def) => ({ color: color('颜色', def) });

/** @type {DirectiveSpec[]} */
export const DIRECTIVES = [
    // ── 结构排版 ──────────────────────────────────────────────
    {
        name: 'grid',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '多列网格',
        attrs: {
            cols: { type: 'number', pattern: '^\\d{1,2}$', format: '1~2 位数字', desc: '固定列数，常用 2、3、4；不写就按 minw 自动换行' },
            gap: { type: 'number', pattern: '^\\d{1,3}$', format: '1~3 位数字', default: '16', desc: '格子间距，单位 px' },
            minw: str('自动列数时的最小列宽', { default: '240px' }),
            bg: { type: 'enum', values: ['card', 'box', 'none'], default: 'card', desc: '格子背景样式' },
        },
        body: { kind: 'markdown', desc: '格子之间用 `---` 分隔' },
        notes: [
            '`---` 前后都要空一行，紧贴在文字行下面会把那一行变成标题',
            '网格里的 `---` 是格子分隔符，不能再当分隔线用',
        ],
        example: ':::grid{cols="3" gap="12"}\n**标题 1**\n内容 1\n\n---\n\n**标题 2**\n内容 2\n:::',
    },
    {
        name: 'tabs',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '标签页',
        attrs: {},
        body: { kind: 'markdown', desc: '每个 `tab: 标签名` 行开始一个标签页' },
        notes: [
            '`tab:` 行前后都要空一行',
            '`tab: 标签名{color=blue}` 给单个标签设颜色',
            '标签页里还要放 `:::` 指令时，外层写成 `::::tabs`',
        ],
        example: ':::tabs\ntab: 标签 1\n\n内容 1\n\ntab: 标签 2\n\n内容 2\n:::',
    },
    {
        name: 'folding',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '折叠面板',
        attrs: {
            title: str('折叠按钮上的文字', { default: 'Details' }),
            open: bool('默认展开'),
            color: color('颜色', 'accent'),
        },
        body: { kind: 'markdown', desc: '折叠起来的内容' },
        example: ':::folding{title="查看完整配置"}\n较长的内容\n:::',
    },
    {
        name: 'folders',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '多级折叠',
        attrs: {
            expand: { type: 'enum', values: ['first', 'none', 'all'], default: 'first', desc: '哪些分组默认展开：第一个、全部折叠、全部展开' },
        },
        body: { kind: 'markdown', desc: '每个 `folder: 标题` 行开始一个分组' },
        notes: [
            '`folder:` 行前后都要空一行',
            '`folder: 标题 {open}` 或 `{closed}` 单独指定某个分组，优先于 expand',
        ],
        example: ':::folders\nfolder: 第一章 基础\n\n内容 1\n\nfolder: 第二章 组件\n\n内容 2\n:::',
    },
    {
        name: 'timeline',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '时间线',
        attrs: {},
        body: { kind: 'list', desc: '列表，每项写成 `时间 | 标题 | 描述`' },
        notes: ['描述可以省略；没有 `|` 的列表项会被丢掉'],
        example: ':::timeline\n- 2024-01 | 项目启动 | 确定技术栈\n- 2024-03 | 发布 v1 | 功能上线\n:::',
    },
    {
        name: 'banner',
        category: '结构排版',
        module: 'image',
        forms: ['container'],
        summary: '横幅头图',
        attrs: {
            title: str('主标题', { required: true }),
            subtitle: str('副标题'),
            bg: str(`背景图，${IMAGE_SRC}`),
            avatar: str('头像，写法同 bg'),
            link: str('点击跳转的链接；不写时左上角显示返回按钮'),
        },
        body: { kind: 'none', desc: '没有正文' },
        example: ':::banner{title="山与湖" subtitle="记录每一次出发" bg="https://..."}\n:::',
    },
    {
        name: 'poetry',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '诗词排版',
        attrs: {
            title: str('标题'),
            author: str('作者'),
            date: str('日期或朝代'),
            footer: str('底部注释'),
        },
        body: { kind: 'markdown', desc: '诗句，一行一句' },
        example: ':::poetry{title="静夜思" author="李白" date="唐"}\n床前明月光，\n疑是地上霜。\n:::',
    },
    {
        name: 'paper',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '信纸',
        attrs: {
            title: str('标题，居中显示'),
            author: str('作者'),
            date: str('日期'),
            footer: str('底部文字'),
        },
        body: { kind: 'markdown', desc: '正文，用 HTML 注释标记分段' },
        notes: [
            '`<!-- paragraph -->` 开始普通段落（首行缩进）',
            '`<!-- section 标题 -->` 开始带居中标题的一节',
            '`<!-- line right -->` 下一行靠右对齐',
        ],
        example: ':::paper{title="信" author="作者" date="日期"}\n正文\n<!-- paragraph -->\n下一段\n:::',
    },
    {
        name: 'reel',
        category: '结构排版',
        module: 'blocks',
        forms: ['container'],
        summary: '竖排卷轴',
        attrs: {
            title: str('标题'),
            author: str('作者'),
            date: str('日期或朝代'),
            footer: str('底部文字'),
        },
        body: { kind: 'markdown', desc: '正文，从右往左竖排' },
        example: ':::reel{title="兰亭集序" author="王羲之" date="东晋"}\n竖排文字\n:::',
    },

    // ── 内容展示 ──────────────────────────────────────────────
    {
        name: 'callout',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '提示框',
        attrs: {
            type: { type: 'enum', values: ['info', 'tip', 'warn', 'danger'], default: 'info', desc: '类型：蓝色信息、绿色建议、黄色警告、红色危险' },
            title: str('标题，不写就用类型名'),
        },
        body: { kind: 'markdown', desc: '提示内容' },
        example: ':::callout{type="tip" title="小技巧"}\n提示内容\n:::',
    },
    {
        name: 'note',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '高亮块',
        attrs: {
            color: color('颜色', 'accent'),
            title: str('标题'),
        },
        body: { kind: 'markdown', desc: '内容' },
        example: ':::note{color="blue" title="关于主题"}\n内容\n:::',
    },
    {
        name: 'quot',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '引用卡片',
        attrs: {
            icon: str('图标：Iconify 全名（`lucide:lightbulb`）、只写名字（自动补 `lucide:`）或图片地址；不写用引号'),
        },
        body: { kind: 'text', desc: '引用内容，按纯文本显示' },
        example: ':::quot{icon="lightbulb"}\n引用内容\n:::',
    },
    {
        name: 'title',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '装饰标题',
        attrs: {
            style: { type: 'enum', values: ['quote', 'badge'], default: 'quote', desc: '样式：引号装饰、徽章标记' },
            el: { type: 'enum', values: ['h2', 'h3', 'h4', 'h5', 'h6'], default: 'h2', desc: '标题级别' },
            centered: bool('居中'),
            color: color('颜色', 'rgb(255, 87, 36)'),
            shadow: bool('加阴影'),
            prefix: str('前缀：Iconify 图标名、图片或文字；`"false"` 去掉默认前缀'),
            suffix: str('后缀，只在 quote 样式下有效，写法同 prefix'),
        },
        body: { kind: 'text', desc: '标题文字，渲染成真正的标题' },
        example: ':::title{style="quote"}\n读万卷书，行万里路\n:::',
    },
    {
        name: 'blockquote',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '带引号的段落',
        attrs: {},
        body: { kind: 'markdown', desc: '引用内容，可以多段' },
        example: ':::blockquote\n多段引用内容\n:::',
    },
    {
        name: 'panel',
        category: '内容展示',
        module: 'cards',
        forms: ['container'],
        summary: '多段代码并列',
        attrs: {},
        body: { kind: 'code', desc: '几段代码块；代码块的 `title` 是左侧标签，`right` 是右侧说明' },
        notes: ['也可以在每段前写 `<!-- label: 左 | 右 -->` 标记，两种写法能混用'],
        example: ':::panel\n```js title="文件 A" right="说明 A"\ncode...\n```\n\n```js title="文件 B" right="说明 B"\ncode...\n```\n:::',
    },
    {
        name: 'copy',
        category: '内容展示',
        module: 'blocks',
        forms: ['container'],
        summary: '一键复制',
        attrs: {
            label: str('左侧标签，说明这段内容的用途'),
        },
        body: { kind: 'text', desc: '要复制的内容，会合成一行纯文本' },
        example: ':::copy{label="安装依赖"}\npnpm add remark-directive\n:::',
    },
    {
        name: 'private',
        category: '内容展示',
        module: 'private',
        forms: ['container'],
        summary: '密码加密内容',
        attrs: {
            password: str('解密密码', { required: true }),
            hint: str('密码提示'),
        },
        body: { kind: 'markdown', desc: '加密的内容' },
        example: ':::private{password="vergil" hint="主题名"}\n加密内容\n:::',
    },

    // ── 媒体嵌入 ──────────────────────────────────────────────
    {
        name: 'image',
        category: '媒体嵌入',
        module: 'image',
        forms: ['leaf', 'text', 'container'],
        summary: '增强图片，alt 显示为说明',
        attrs: {
            src: str(`图片地址，${IMAGE_SRC}`, { required: true }),
            alt: str('图片描述，显示在图片下方'),
            width: str('宽度，如 `300px`'),
            height: str('高度'),
            ratio: str('固定宽高比', { pattern: '^\\d+(\\.\\d+)?/\\d+(\\.\\d+)?$', format: '宽/高，如 1/1、16/9' }),
            download: str('`true` 显示下载按钮，也可以写自定义下载链接'),
            fancybox: bool('点击放大，写 `"false"` 关闭', 'true'),
            bg: str('图片底色，CSS background 值'),
            padding: str('图片四周留白，CSS padding 值'),
        },
        body: { kind: 'none', desc: '没有正文' },
        notes: ['一般写成单行 `::image{...}`；写成 `:::image` 必须闭合，否则后面的内容全会被吞掉'],
        example: '::image{src="https://..." alt="图片说明" download="true" ratio="1/1" width="300px"}',
    },
    {
        name: 'gallery',
        category: '媒体嵌入',
        module: 'image',
        forms: ['container'],
        summary: '图片画廊',
        attrs: {
            layout: { type: 'enum', values: ['grid', 'flow'], default: 'grid', desc: '网格或瀑布流' },
            size: { type: 'enum', values: ['xs', 's', 'm', 'l', 'xl', 'mix'], default: 'm', desc: '图片尺寸' },
            ratio: { type: 'enum', values: ['square', 'portrait', 'origin'], desc: '固定图片比例，origin 保持原始比例' },
        },
        body: { kind: 'images', desc: '一行一张 `![说明](地址)`' },
        example: ':::gallery{layout="grid"}\n![alt](url)\n![alt](url)\n:::',
    },
    {
        name: 'photo',
        category: '媒体嵌入',
        module: 'photo',
        forms: ['leaf', 'container'],
        summary: '摄影框，带相机参数',
        attrs: {
            src: str(`图片地址，${IMAGE_SRC}；容器写法里可以不写，取正文第一张图`),
            alt: str('图片描述'),
            type: { type: 'enum', values: ['blur', 'watermark'], default: 'blur', desc: '模糊背景或白边水印' },
            brand: str('相机品牌，如 Fujifilm、Sony，常见品牌显示 Logo'),
            logo: str('Logo 和品牌名不一样时单独指定'),
            model: str('机型，只在 watermark 样式显示'),
            focal: str('焦距'),
            aperture: str('光圈'),
            shutter: str('快门'),
            iso: str('感光度'),
            datetime: str('拍摄时间，只在 watermark 样式显示'),
            fancybox: bool('点击放大，写 `"false"` 关闭', 'true'),
        },
        body: { kind: 'markdown', desc: '单行写法没有正文；容器写法可以不写 src，在正文放一张 `![](...)`' },
        notes: ['相机参数只填文章里写明的值，不要编'],
        example: '::photo{src="https://..." brand="Fujifilm" focal="23mm" aperture="f/8" shutter="1/250s" iso="ISO 160"}',
    },
    {
        name: 'video',
        category: '媒体嵌入',
        module: 'media',
        forms: ['container'],
        summary: '视频：本地 / bilibili / youtube',
        attrs: {
            src: str('本地或外链视频地址'),
            bilibili: str('B 站 BV 号'),
            youtube: str('YouTube 视频 ID'),
            poster: str(`封面图，${IMAGE_SRC}`),
            ratio: str('宽高比', { default: '16/9', pattern: '^\\d+(\\.\\d+)?/\\d+(\\.\\d+)?$', format: '宽/高，如 16/9、4/3、9/16' }),
            width: str('最大宽度，如 `600px`'),
            align: ALIGN,
            autoplay: bool('自动播放（静音）'),
            pip: { type: 'enum', values: ['auto', 'manual', 'off'], default: 'auto', desc: '画中画，只对本地视频有效：滚出视口自动触发、手动、关闭' },
        },
        oneOf: [['src', 'bilibili', 'youtube']],
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::video{bilibili="BV1GJ411x7h7"}\n:::',
    },
    {
        name: 'audio',
        category: '媒体嵌入',
        module: 'media',
        forms: ['container'],
        summary: '音频：本地 / 网易云 / 语音',
        attrs: {
            src: str('音频文件地址'),
            netease: str('网易云音乐歌曲 ID'),
            voice: str('语音文件地址'),
            title: str('标题'),
            artist: str('艺术家'),
            cover: str(`封面图，${IMAGE_SRC}`),
            duration: { type: 'number', pattern: '^\\d+(\\.\\d+)?$', format: '秒数', desc: '语音时长（秒），决定波形长度' },
            mode: { type: 'enum', values: ['mini', 'card'], default: 'mini', desc: '网易云播放器样式：窄条或带封面的大卡片' },
            align: ALIGN,
            width: str('宽度，如 `400px`'),
            autoplay: bool('自动播放'),
        },
        oneOf: [['src', 'netease', 'voice']],
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::audio{netease="25706282" title="晴天" artist="歌手" mode="card"}\n:::',
    },

    // ── 卡片与链接 ────────────────────────────────────────────
    {
        name: 'ghcard',
        category: '卡片与链接',
        module: 'cards',
        forms: ['container'],
        summary: 'GitHub 仓库或用户卡片',
        attrs: {
            type: { type: 'enum', values: ['repo', 'user'], default: 'repo', desc: '仓库卡片或用户卡片' },
            repo: str('仓库全名 `owner/repo`，type 为 repo 时必填'),
            user: str('GitHub 用户名，type 为 user 时必填'),
            bio: str('自定义简介，只对 user 有效'),
            avatar: bool('显示头像，只对 user 有效', 'true'),
        },
        oneOf: [['repo', 'user']],
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::ghcard{type="repo" repo="owner/repo"}\n:::',
    },
    {
        name: 'yoicard',
        category: '卡片与链接',
        module: 'cards',
        forms: ['container'],
        summary: '数字名片',
        attrs: {
            name: str('名字', { required: true }),
            role: str('头衔或一句话简介，单行'),
            bg: str('纯色背景，如 `#1a3a2e`'),
            'bg-image': str(`背景图，${IMAGE_SRC}`),
            'bg-mode': { type: 'enum', values: ['full', 'left', 'right'], default: 'full', desc: '背景图铺满、只占左半或右半' },
            'bg-overlay': str('铺满时的遮罩：`dark`、`light`、`none` 或一个颜色', { default: 'dark' }),
            'bg-pattern': { type: 'enum', values: ['diagonal', 'dots', 'grid', 'grain'], desc: '内置纹理' },
            'bg-gradient': str('CSS 渐变参数，如 `135deg, #fef3c7, #fed7aa`，会自动包上 linear-gradient()'),
            logo: str('右上角的图，写法同 bg-image'),
            'logo-shape': { type: 'enum', values: ['circle', 'square', 'rounded'], default: 'circle', desc: 'logo 形状' },
            icon: str('左上角的装饰图标，Iconify 全名'),
            accent: str('左上角短线和图标的颜色，默认跟随文字色'),
            qr: str('二维码内容，一般写主页地址'),
            'font-name': str('名字的字体，完整的 font-family 写法'),
            'font-body': str('其余文字的字体'),
            text: str('文字配色：`auto`、`light`、`dark` 或 `#hex`', { default: 'auto' }),
            'name-color': str('只改名字的颜色'),
            'role-color': str('只改头衔的颜色'),
        },
        body: { kind: 'markdown', desc: '`<!-- contact -->` 上面是简介，下面是联系方式' },
        notes: ['`text="auto"` 对渐变背景一律用深色字，深色渐变要自己写 `text="light"`'],
        example: ':::yoicard{name="你的名字" role="写作者 · 摄影师"}\n\n一句话简介\n\n<!-- contact -->\n\n**example.com**\nhello@example.com\n:::',
    },
    {
        name: 'sites',
        category: '卡片与链接',
        module: 'cards',
        forms: ['container'],
        summary: '网站卡片，数据在 src/data/config/links.ts',
        attrs: {
            group: str('`links.ts` 里的分组名', { required: true }),
        },
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::sites{group="friends"}\n:::',
    },
    {
        name: 'posters',
        category: '卡片与链接',
        module: 'cards',
        forms: ['container'],
        summary: '海报墙，数据和 sites 共用 links.ts',
        attrs: {
            group: str('`links.ts` 里的分组名', { required: true }),
            ratio: { type: 'enum', values: ['portrait', 'square'], default: 'portrait', desc: '2:3 竖版或 1:1 方形' },
            cols: { type: 'number', pattern: '^[2-8]$', format: '2~8', desc: '固定列数，不写自动' },
        },
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::posters{group="movies" ratio="square"}\n:::',
    },
    {
        name: 'hashtag',
        category: '卡片与链接',
        module: 'inline',
        forms: ['text'],
        summary: '标签链接',
        attrs: {
            href: str('跳转链接'),
            color: color('颜色，不写就在 7 种颜色里轮换'),
        },
        body: { kind: 'text', desc: '标签文字' },
        example: ':hashtag[Astro]{href="/tags/astro"}',
    },
    {
        name: 'button',
        category: '卡片与链接',
        module: 'inline',
        forms: ['text'],
        summary: '按钮链接',
        attrs: {
            href: str('跳转链接'),
            color: color('颜色', 'accent'),
            icon: str('图标：Iconify 名（`lucide:search`）或图片地址'),
            size: { type: 'enum', values: ['xs'], desc: '`xs` 是小尺寸' },
        },
        body: { kind: 'text', desc: '按钮文字' },
        example: ':button[查看文档]{href="/" color="accent" icon="lucide:search"}',
    },

    // ── 文字与交互 ────────────────────────────────────────────
    {
        name: 'mark',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '高亮文字',
        attrs: textColor('yellow'),
        body: { kind: 'text', desc: '高亮的文字' },
        notes: ['不写 color 默认黄色，不是主题色'],
        example: ':mark[关键内容]\n:mark[特别注意]{color="red"}',
    },
    {
        name: 'u',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '下划线',
        attrs: textColor('accent'),
        body: { kind: 'text', desc: '加下划线的文字' },
        example: ':u[下划线]{color="blue"}',
    },
    {
        name: 'emp',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '着重号',
        attrs: textColor('accent'),
        body: { kind: 'text', desc: '加着重号的文字' },
        example: ':emp[需要强调的内容]',
    },
    {
        name: 'wavy',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '波浪线',
        attrs: textColor('accent'),
        body: { kind: 'text', desc: '加波浪线的文字' },
        example: ':wavy[拼写错误提示]{color="red"}',
    },
    {
        name: 'del',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '删除线',
        attrs: {},
        body: { kind: 'text', desc: '划掉的文字' },
        example: ':del[¥199]',
    },
    {
        name: 'sup',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '上标',
        attrs: textColor('accent'),
        body: { kind: 'text', desc: '上标内容' },
        example: 'E = mc:sup[2]',
    },
    {
        name: 'sub',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '下标',
        attrs: textColor('accent'),
        body: { kind: 'text', desc: '下标内容' },
        example: 'H:sub[2]O',
    },
    {
        name: 'kbd',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '键盘按键',
        attrs: {},
        body: { kind: 'text', desc: '按键名' },
        example: ':kbd[Ctrl] + :kbd[C]',
    },
    {
        name: 'blur',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '模糊显示，点击揭示',
        attrs: {},
        body: { kind: 'text', desc: '模糊的文字' },
        example: ':blur[点击这里查看隐藏内容]',
    },
    {
        name: 'psw',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '密码遮罩，点击显示明文',
        attrs: {},
        body: { kind: 'text', desc: '遮住的文字' },
        example: ':psw[MySecretDB_2024]',
    },
    {
        name: 'checkbox',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '复选框',
        attrs: {
            checked: bool('选中'),
            inline: bool('在段落里内联显示，默认独占一行'),
            color: color('颜色', 'blue'),
            symbol: { type: 'enum', values: ['plus', 'minus', 'times'], desc: '框里的符号，不写就是勾' },
        },
        body: { kind: 'text', desc: '选项文字' },
        example: ':checkbox[未勾选]\n:checkbox[已勾选]{checked="true" color="green"}',
    },
    {
        name: 'radio',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '单选框',
        attrs: {
            checked: bool('选中'),
            inline: bool('在段落里内联显示，默认独占一行'),
            color: color('颜色', 'blue'),
        },
        body: { kind: 'text', desc: '选项文字' },
        example: ':radio[选项 A]{checked="true" color="orange"}',
    },
    {
        name: 'step-brackets',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '步骤编号',
        attrs: {
            title: str('步骤标题'),
        },
        body: { kind: 'text', desc: '步骤编号' },
        example: ':step-brackets[01]{title="克隆仓库"}',
    },
    {
        name: 'emoji',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '表情包',
        attrs: {
            source: str('表情源：default（同 qq）、qq、aru、tieba、blobcat、twemoji，也可以写带 `{name}` 的图片地址模板', { default: 'default' }),
            name: str('表情名，不写就用方括号里的内容'),
            height: str('高度', { default: '1.75em' }),
        },
        body: { kind: 'text', desc: '表情在所选表情源里的名字；twemoji 用 Unicode 码点，如 `1f600`' },
        notes: ['表情名取决于表情源，不确定名字时不要加'],
        example: '终于跑通了 :emoji[1f389]{source="twemoji"}',
    },
    {
        name: 'ann',
        category: '文字与交互',
        module: 'inline',
        forms: ['text'],
        summary: '手绘标注：从文字画箭头指向旁边的批注',
        attrs: {
            note: str('批注文字，不写就只给文字加底色'),
            direction: { type: 'enum', values: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'], default: 'bottom', desc: '批注在文字的哪个方位' },
            color: { type: 'enum', values: ['amber', 'blue', 'green', 'red', 'purple', 'rainbow'], desc: '箭头、批注和底色的颜色，不写是暖灰' },
        },
        body: { kind: 'text', desc: '被标注的文字' },
        notes: ['相邻几行的标注换着方向写，批注才不会叠在一起'],
        example: ':ann[空山]{note="雨后的安静" direction="top-right" color="green"}新雨后',
    },

    // ── 图表可视化 ────────────────────────────────────────────
    {
        name: 'mermaid',
        category: '图表可视化',
        module: 'charts',
        forms: ['container'],
        summary: 'Mermaid 流程图、时序图等',
        attrs: {},
        body: { kind: 'text', desc: 'Mermaid 源码，任意图表类型' },
        notes: ['正文会先经过 Markdown 解析；标签里有引号、`*`、`_` 或 `[]()` 时，把图表源码放进指令里的代码块'],
        example: ':::mermaid\nflowchart LR\n    A[请求] --> B{有缓存?}\n    B -->|是| C[返回缓存]\n    B -->|否| D[查数据库]\n:::',
    },
    {
        name: 'echart',
        category: '图表可视化',
        module: 'charts',
        forms: ['container'],
        summary: 'ECharts 图表',
        attrs: {
            height: str('图表高度', { default: '400px' }),
        },
        body: { kind: 'json', desc: 'ECharts setOption 的 JSON 配置，不能有函数；也可以放在指令里的 json 代码块中' },
        example: ':::echart{height="300px"}\n{\n  "xAxis": { "type": "category", "data": ["一月", "二月", "三月"] },\n  "yAxis": { "type": "value" },\n  "series": [{ "type": "bar", "data": [120, 200, 150] }]\n}\n:::',
    },

    // ── 时间规划 ──────────────────────────────────────────────
    {
        name: 'deadline',
        category: '时间规划',
        module: 'blocks',
        forms: ['container'],
        summary: '翻牌倒计时',
        attrs: {
            date: str('目标时间', { required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2})?)?$', format: 'YYYY-MM-DD 或 YYYY-MM-DDTHH:MM:SS' }),
            title: str('标题'),
            description: str('说明文字'),
            showSeconds: bool('显示秒', 'true'),
            expiredText: str('截止后显示的文字，默认「已截止」'),
        },
        body: { kind: 'none', desc: '没有正文，但要写闭合的 `:::`' },
        example: ':::deadline{date="2026-12-31T23:59:59" title="报名截止" description="剩余时间"}\n:::',
    },
    {
        name: 'calendar',
        category: '时间规划',
        module: 'calendar',
        forms: ['container'],
        summary: '月历，自动加农历、节气和法定节假日',
        attrs: {
            month: str('打开时显示的月份，不写是当前月', { pattern: '^\\d{4}-\\d{2}$', format: 'YYYY-MM' }),
        },
        body: { kind: 'table', desc: '事件表格', columns: ['date', 'type', 'content', 'color', 'link'] },
        notes: [
            '表头用英文，每一列都可以不写',
            'date 写 `MM-DD`、`YYYY-MM-DD` 或日数 `D`；同一个 type 同一种颜色',
            'color 可选 blue、green、red、purple、yellow、cyan、orange、pink',
        ],
        example: ':::calendar{month="2026-05"}\n| date | type | content | color | link |\n| ---- | ---- | ------- | ----- | ---- |\n| 05-01 | 假期 | 短途旅行 | red | |\n:::',
    },
    {
        name: 'okr',
        category: '时间规划',
        module: 'okr',
        forms: ['container'],
        summary: 'OKR 目标与关键结果',
        attrs: {
            title: str('总标题'),
            period: str('周期，如「2026 Q2」'),
        },
        body: { kind: 'table', desc: '`## 目标` 标题下面跟关键结果表格', columns: ['Key Result', 'Target', 'Current', 'Description', 'Status', 'Link'] },
        notes: [
            '标题下面的段落是这个目标的说明；进度 = Current / Target',
            'Status 可选 ontrack、at-risk、behind、completed（或 正常、风险、滞后、完成），写别的按正常显示',
        ],
        example: ':::okr{title="Q2 目标" period="2026 Q2"}\n## O1: 扩大订阅\n\n| Key Result | Target | Current | Status |\n|------------|--------|---------|--------|\n| 订阅人数 | 1000 | 640 | ontrack |\n:::',
    },
    {
        name: 'plan',
        category: '时间规划',
        module: 'blocks',
        forms: ['container'],
        summary: '多视图任务看板',
        attrs: {
            title: str('标题'),
            views: { type: 'list', values: ['board', 'list', 'table', 'timeline', 'milestone', 'progress', 'ebbinghaus'], default: 'board,list,table,timeline,milestone,progress', desc: '启用的视图，逗号分隔' },
            default: { type: 'enum', values: ['board', 'list', 'table', 'timeline', 'milestone', 'progress', 'ebbinghaus'], desc: '默认视图，不写是 views 的第一个' },
            groupBy: str('board 按哪一列分组，默认第一列'),
            groupOrder: str('board 的分组和列顺序，逗号分隔'),
            filters: str('table 可筛选的列，逗号分隔'),
            dateCol: str('日期列'),
            startDate: str('范围起始列，和 endDate 一起画甘特条'),
            endDate: str('范围结束列'),
            progressCol: str('进度列'),
            statusCol: str('状态列'),
            titleCol: str('标题列'),
            ownerCol: str('负责人列'),
            priorityCol: str('优先级列'),
            descCol: str('描述列'),
            steps: str('ebbinghaus 复习间隔天数，逗号分隔，默认 1,2,4,7,15,30'),
        },
        body: { kind: 'table', desc: '任务表格，表头写成 `列名:类型`' },
        notes: [
            '列类型：text（默认）、status（todo/doing/done）、priority（P0/P1/P2）、date、progress、number、checkbox（true/false）、select、link',
            '属性必须写在开头那一行，不能换行',
            'timeline 要 dateCol 或 startDate/endDate；milestone 和 ebbinghaus 要 dateCol；progress 要 progressCol',
        ],
        example: ':::plan{title="发布计划" views="board,table,timeline" dateCol="截止" statusCol="状态" titleCol="任务"}\n| 任务:text | 状态:status | 截止:date | 进度:progress |\n|-----------|-------------|-----------|---------------|\n| 写规格 | done | 2026-01-10 | 100% |\n| 开发 | doing | 2026-02-01 | 60% |\n:::',
    },

    // ── 可视化叙事 ────────────────────────────────────────────
    {
        name: 'story',
        category: '可视化叙事',
        module: 'story',
        forms: ['container'],
        summary: '分镜故事板',
        attrs: {},
        body: { kind: 'table', desc: '分镜表格', columns: ['shot', 'image', 'desc', 'dialogue', 'note'], requiredColumns: ['shot'] },
        notes: ['image 写 `![](地址)` 或纯文本地址；其他列名显示成彩色标签'],
        example: ':::story\n| shot | scale | duration | image | desc | dialogue |\n|------|-------|----------|-------|------|----------|\n| 1 | 特写 | 3s | https://... | 她看了眼手机 | 「怎么了？」 |\n:::',
    },
    {
        name: 'mind',
        category: '可视化叙事',
        module: 'mind',
        forms: ['container'],
        summary: '思维导图',
        attrs: {},
        body: { kind: 'list', desc: '嵌套列表，可折叠、缩放' },
        example: ':::mind\n- 主题设计\n  - 视觉系统\n    - 配色\n    - 字体\n  - 内容指令\n:::',
    },
];

/** 适用于所有指令的写法规则 */
export const SYNTAX_RULES = [
    '行内指令 `:name[内容]{属性}` 嵌在段落里；单行指令 `::name{属性}` 独占一行、没有正文；容器指令以 `:::name{属性}` 开头、单独一行 `:::` 结尾',
    '没有正文的容器（banner、ghcard、video 等）也要写结尾的 `:::`',
    '属性全部写在开头那一行，`{...}` 里换行会让指令失效；冒号和名字之间不能有空格',
    '属性值加双引号，如 `title="A b"`；开关属性写 `"true"` / `"false"`',
    '容器嵌套时外层冒号必须比内层多：`::::` 包 `:::`，`:::::` 包 `::::`；代码块里的冒号不算',
    '`tab:`、`folder:` 是容器里的普通行，不是指令，各占一行，前后空行',
];

/** 不是指令、但写文章时同样要知道的语法 */
export const EXTRAS = [
    {
        name: 'code',
        title: '代码块（内置，不是指令）',
        example: '```ts title="vite.config.ts" highlight="2"\nimport { defineConfig } from \'vite\'\nimport tailwindcss from \'@tailwindcss/vite\'\n```\n\n```bash title="安装"\n$ pnpm install\nDone in 3.2s\n```',
        notes: [
            '代码块渲染成带标题栏的窗口，标题默认是语言名，`title` 覆盖它（适合写文件名）',
            '`linenos` 显示行号；`highlight="2,4-6"` 高亮行（值要加引号）；`no-title` 不要窗口',
            'bash、sh、shell、zsh、console、fish 按终端处理：`$ ` 开头的是命令，复制时只复制命令；`~/app$ cmd` 设置提示符路径；输出里要写 `$` 时写 `\\$`',
            'markdown 代码块和 panel 里的代码块保持普通样式',
        ],
    },
    {
        name: 'math',
        title: '数学公式（frontmatter 开关，不是指令）',
        example: '---\nkatex: true\n---\n\n行内 $E = mc^2$，块级：\n\n$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$',
        notes: [
            'frontmatter 写 `katex: true`（轻、快）或 `mathjax: true`（LaTeX 支持更全，两个都写时用它）才会渲染，否则 `$...$` 原样显示',
            '行内 `$...$` 两边要有空格或标点；`$$` 块单独成行',
        ],
    },
];

/** 按名字查指令 */
export const DIRECTIVE_MAP = new Map(DIRECTIVES.map((d) => [d.name, d]));
