/**
 * Vergil's Astro integration. A site's astro.config.mjs only needs:
 *
 *   import vergil from '@vergil-astro/theme';
 *   import siteConfig from './src/data/site-config';
 *   export default defineConfig({ site: siteConfig.website, integrations: [vergil({ config: siteConfig })] });
 *
 * It handles all of the framework's wiring: injecting page routes, Markdown plugins, code highlighting, Tailwind, appearance (skin) registration,
 * and letting framework code read the site's own config (the @vergil-site alias points to the site's src/).
 * The site repo keeps only content, images, config, and public; upgrading the framework means upgrading this package.
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
import { mergeText } from './i18n/merge';
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
    /** Site config, i.e. the object default-exported by the site's src/data/site-config.ts */
    config: SiteConfig;
}

const dictionaries = { 'zh-CN': zhCN, en } as const;
const pagesDir = fileURLToPath(new URL('./pages/', import.meta.url));

/** Pages bundled with the framework: every file under pages/ is injected as a route following the directory structure, same as placing it in the site's src/pages */
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
    const locale = config.locale && config.locale in dictionaries ? (config.locale as keyof typeof dictionaries) : 'zh-CN';
    // Same as src/i18n/index.ts: apply the site's uiText overrides on top, so text inside content directives changes too
    const t = mergeText(dictionaries[locale], config.uiText);

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
                            // Framework code reads the site's own config through this alias: @vergil-site/data/config/identity
                            alias: { '@vergil-site': siteSrc }
                        },
                        optimizeDeps: {
                            include: ['mermaid', 'echarts']
                        }
                    },
                    // Skins are loaded from the site's skins/ directory by the names in identity.ts; see appearance/integration.mjs.
                    // Its errors and warnings run in the config phase, before the @vergil-site alias that src/i18n relies on exists, so the messages are passed in here
                    integrations: [sitemap(), appearance({ skins: config.skins, messages: t.build.appearance })],
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
                            // rehypeHeadingIds must be listed explicitly first: Astro's own run only happens after user plugins,
                            // by which point rehypeHeadingAnchors could not read the heading ids. The plugin is idempotent, so running it twice has no side effects.
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
