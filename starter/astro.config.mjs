import { defineConfig } from 'astro/config';
import vergil from '@vergil-astro/theme';
import siteConfig from './src/data/site-config';

// 框架的页面、Markdown 插件、代码高亮、样式和皮肤都由 vergil() 接好，站点只管内容和 src/data 里的配置
export default defineConfig({
    site: siteConfig.website,
    integrations: [vergil({ config: siteConfig })]
});
