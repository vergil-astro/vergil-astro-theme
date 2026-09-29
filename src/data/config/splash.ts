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
