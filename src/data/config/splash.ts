export const splash = {
    enabled: true,
    /** 开屏背景。主题自带的门面图放在 public/assets/defaults/ 下，不走外部图床 */
    backgroundImage: [
        '/assets/defaults/splash-01.webp',
        '/assets/defaults/splash-02.webp',
        '/assets/defaults/splash-03.webp'
    ],
    overlay: 'rgba(0,0,0,0.15)',
    textShadow: true,
    fallbackBg: 'bg-black',
    gradientColor: '#2d2d2d',
    gradientHeight: 'h-56',
    backdropBlur: '12px',
    /**
     * 开屏页控件的玻璃效果：'solid' 普通、'frosted' 毛玻璃、'liquid' 液态玻璃。
     * 知识库封面（_meta.md 的 splash.glass）没写的项沿用这里
     */
    glass: {
        nav: 'liquid', // 导航胶囊，知识库封面上是「开始阅读」按钮
        tint: 0.1 // 玻璃底色浓度，越大越不透明
    },
    slideDuration: 12,
    title: 'Vergil',
    description: 'Astro Framework for Content Creators',
    nav: [
        { text: '博客', href: '/blog', icon: 'book-open' },
        { text: '文档', href: '/docs/vergil-guide/', icon: 'file-text' },
        { text: 'GitHub', href: 'https://github.com/wsjz/vergil-astro-theme', icon: 'github' },
        { text: '关于', href: '/about', icon: 'user' }
    ]
};
