import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { transformerNotationDiff, transformerNotationHighlight, transformerNotationWordHighlight } from '@shikijs/transformers';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import siteConfig from './src/data/site-config';
import { locale, t } from './src/i18n';
import { rehypeMathDispatcher } from './src/plugins/rehype-math-dispatcher.mjs';
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs';
import { rehypeTitleHeadings } from './src/plugins/rehype-title-headings.mjs';
import { remarkContentDirectives } from './src/plugins/directives/index.mjs';
import { remarkImageDirectives } from './src/plugins/remark-image-directives.mjs';
import { remarkPhotoDirectives } from './src/plugins/remark-photo-directives.mjs';
import { remarkTerminal, transformerTerminal } from './src/plugins/shiki-terminal.mjs';
import appearance from './src/appearance/integration.mjs';
import { siteInfo } from './src/data/config/identity';

export default defineConfig({
    site: siteConfig.website,
    image: {
        domains: ['images.unsplash.com']
    },
    vite: {
        plugins: [tailwindcss()],
        optimizeDeps: {
            include: ['mermaid', 'echarts'],
        },
    },
    // 皮肤和配色按 identity.ts 里的名字从 skins/、schemes/ 目录加载，见 src/appearance/integration.mjs
    integrations: [sitemap(), icon(), appearance({ skins: siteInfo.skins, schemes: siteInfo.schemes })],
    markdown: {
        processor: unified({
            remarkPlugins: [remarkDirective, remarkMath, remarkImageDirectives, [remarkPhotoDirectives, { brands: t.directive.photo.brands }], [remarkContentDirectives, { links: siteConfig.links, screenshotService: siteConfig.screenshotService, locale, i18n: t.directive, time: t.time }], remarkTerminal],
            // rehypeHeadingIds 要显式排在前面：Astro 自己那一次在用户插件之后才跑，
            // 那时 rehypeHeadingAnchors 还读不到标题 id。这个插件是幂等的，跑两次无副作用。
            rehypePlugins: [rehypeMathDispatcher, rehypeTitleHeadings, rehypeHeadingIds, [rehypeHeadingAnchors, { anchorTo: t.a11y.anchorTo, anchorToHeading: t.a11y.anchorToHeading }]]
        }),
        shikiConfig: {
            themes: {
                light: 'github-light',
                dark: 'github-dark'
            },
            transformers: [
                transformerTerminal(),
                transformerNotationDiff(),
                transformerNotationHighlight(),
                transformerNotationWordHighlight()
            ],
            wrap: true
        }
    }
});
// force rebuild 1778340557
