/**
 * Vergil 的 Astro 集成。站点的 astro.config.mjs 里只需要：
 *
 *   import vergil from '@vergil-astro/theme';
 *   import siteConfig from './src/data/site-config';
 *   export default defineConfig({ site: siteConfig.website, integrations: [vergil({ config: siteConfig })] });
 *
 * 它负责框架的全部接线：注入页面路由、Markdown 插件、代码高亮、Tailwind、外观（皮肤）注册，
 * 以及让框架代码读到站点自己的配置（别名 @vergil-site 指向站点的 src/）。
 * 站点仓库里只留内容、图片、配置和 public，升级框架就是升级这个包。
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { AstroIntegration } from 'astro';
import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { transformerNotationDiff, transformerNotationHighlight, transformerNotationWordHighlight } from '@shikijs/transformers';
import tailwindcss from '@tailwindcss/vite';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import zhCN from './i18n/zh-CN';
import en from './i18n/en';
import type { SiteConfig } from './types';
import { rehypeMathDispatcher } from './plugins/rehype-math-dispatcher.mjs';
import { rehypeHeadingAnchors } from './plugins/rehype-heading-anchors.mjs';
import { rehypeTitleHeadings } from './plugins/rehype-title-headings.mjs';
import { remarkContentDirectives } from './plugins/directives/index.mjs';
import { remarkImageDirectives } from './plugins/remark-image-directives.mjs';
import { remarkPhotoDirectives } from './plugins/remark-photo-directives.mjs';
import { remarkTerminal, transformerTerminal } from './plugins/shiki-terminal.mjs';
import appearance from './appearance/integration.mjs';

export interface VergilOptions {
    /** 站点配置，也就是站点 src/data/site-config.ts 默认导出的那个对象 */
    config: SiteConfig;
}

const dictionaries = { 'zh-CN': zhCN, en } as const;
const pagesDir = fileURLToPath(new URL('./pages/', import.meta.url));

/** 框架自带的页面：pages/ 下的每个文件按目录结构注入成路由，和放在站点 src/pages 里效果一样 */
function frameworkRoutes(): { pattern: string; entrypoint: string }[] {
    const routes: { pattern: string; entrypoint: string }[] = [];
    for (const rel of readdirSync(pagesDir, { recursive: true }) as string[]) {
        if (!/\.(astro|ts|js)$/.test(rel)) continue;
        const route = rel
            .split(path.sep)
            .join('/')
            .replace(/\.(astro|ts|js)$/, '')
            .replace(/(^|\/)index$/, '');
        routes.push({ pattern: `/${route}`, entrypoint: path.join(pagesDir, rel) });
    }
    return routes;
}

export default function vergil({ config }: VergilOptions): AstroIntegration {
    const locale = config.locale in dictionaries ? (config.locale as keyof typeof dictionaries) : 'zh-CN';
    const t = dictionaries[locale];

    return {
        name: '@vergil-astro/theme',
        hooks: {
            'astro:config:setup': ({ config: astroConfig, updateConfig, injectRoute }) => {
                const siteSrc = fileURLToPath(new URL('./src/', astroConfig.root));

                updateConfig({
                    image: {
                        domains: ['images.unsplash.com']
                    },
                    vite: {
                        plugins: [tailwindcss()],
                        resolve: {
                            // 框架代码通过这个别名读站点自己的配置：@vergil-site/data/config/identity
                            alias: { '@vergil-site': siteSrc }
                        },
                        optimizeDeps: {
                            include: ['mermaid', 'echarts']
                        }
                    },
                    // 皮肤按 identity.ts 里的名字从站点的 skins/ 目录加载，见 appearance/integration.mjs
                    integrations: [sitemap(), appearance({ skins: config.skins })],
                    markdown: {
                        processor: unified({
                            remarkPlugins: [
                                remarkDirective,
                                remarkMath,
                                remarkImageDirectives,
                                [remarkPhotoDirectives, { brands: t.directive.photo.brands }],
                                [remarkContentDirectives, { links: config.links, screenshotService: config.screenshotService, locale, i18n: t.directive, time: t.time }],
                                remarkTerminal
                            ],
                            // rehypeHeadingIds 要显式排在前面：Astro 自己那一次在用户插件之后才跑，
                            // 那时 rehypeHeadingAnchors 还读不到标题 id。这个插件是幂等的，跑两次无副作用。
                            rehypePlugins: [
                                rehypeMathDispatcher,
                                rehypeTitleHeadings,
                                rehypeHeadingIds,
                                [rehypeHeadingAnchors, { anchorTo: t.a11y.anchorTo, anchorToHeading: t.a11y.anchorToHeading }]
                            ]
                        }),
                        shikiConfig: {
                            themes: {
                                light: 'github-light',
                                dark: 'github-dark'
                            },
                            transformers: [transformerTerminal(), transformerNotationDiff(), transformerNotationHighlight(), transformerNotationWordHighlight()],
                            wrap: true
                        }
                    }
                });

                for (const route of frameworkRoutes()) injectRoute(route);
            }
        }
    };
}
