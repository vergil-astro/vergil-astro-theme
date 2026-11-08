import { glob } from 'astro/loaders';
import { defineCollection, z, type ImageFunction } from 'astro:content';
import zhCN from './i18n/zh-CN';
import en from './i18n/en';
import { mergeText, type DeepPartial } from './i18n/merge';

/**
 * Build messages in the site's UI language, picked the same way as src/i18n/index.ts.
 * This file cannot import src/i18n: sites type-check it as part of their own content config, where the @vergil-site alias
 * that src/i18n reads the site config through does not exist. import.meta.glob resolves /src/ from the site root instead,
 * the same way utils/image-utils.ts finds the site's images; if the file is missing, the default language is used.
 */
type Identity = { siteInfo?: { locale?: string; uiText?: DeepPartial<typeof zhCN> } };
const siteInfo = Object.values(import.meta.glob<Identity>('/src/data/config/identity.ts', { eager: true }))[0]?.siteInfo;
const dictionaries = { 'zh-CN': zhCN, en } as const;
const locale = siteInfo?.locale && Object.hasOwn(dictionaries, siteInfo.locale) ? (siteInfo.locale as keyof typeof dictionaries) : 'zh-CN';
const t = mergeText(dictionaries[locale], siteInfo?.uiText);

const imageSchema = (image: ImageFunction) =>
    z.object({
        src: image(),
        alt: z.string().optional()
    });

/**
 * Cover images in content: the @img/ alias pointing to files under src/assets/img/ is recommended, since those get optimized;
 * public paths starting with / and external links also work, and both are output as is.
 *
 * The string branch must come first: image() fails right away with an "image not found" error on paths starting with /,
 * instead of falling through to the next branch.
 */
const imageOrPath = (image: ImageFunction) => z.union([z.string().regex(/^(\/|https?:\/\/)/), image()]);

const seoSchema = (image: ImageFunction) =>
    z.object({
        title: z.string().min(5).max(120).optional(),
        description: z.string().min(15).max(160).optional(),
        image: imageSchema(image).optional(),
        pageType: z.enum(['website', 'article']).default('website')
    });

const fontsSchema = z.object({
    display: z.string().optional(),
    body: z.string().optional()
}).optional();

const blog = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            excerpt: z.string().optional(),
            publishDate: z.coerce.date(),
            updatedDate: z.coerce.date().optional(),
            isFeatured: z.boolean().default(false),
            tags: z.array(z.string()).default([]),
            categories: z.array(z.string()).optional(),
            series: z.string().optional(),
            draft: z.boolean().default(false),
            banner: imageOrPath(image).optional(),
            seo: seoSchema(image).optional(),
            fonts: fontsSchema
        })
});

const pages = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            seo: seoSchema(image).optional(),
            fonts: fontsSchema
        })
});

const projects = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string().optional(),
            publishDate: z.coerce.date(),
            isFeatured: z.boolean().default(false),
            seo: seoSchema(image).optional(),
            fonts: fontsSchema
        })
});

const photoSchema = (image: ImageFunction) =>
    z.object({
        src: image(),
        alt: z.string().optional(),
        caption: z.string().optional(),
        season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
        featured: z.boolean().default(false),
        exif: z.object({
            camera: z.string().optional(),
            /** Device model. The demo content has always set this field, but it was missing from the schema, so zod silently dropped it */
            model: z.string().optional(),
            lens: z.string().optional(),
            focal: z.string().optional(),
            aperture: z.string().optional(),
            shutter: z.string().optional(),
            iso: z.string().optional(),
            datetime: z.string().optional()
        }).optional()
    });

const albums = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/albums' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string().optional(),
            date: z.coerce.date(),
            cover: image().optional(),
            images: z.array(photoSchema(image)).default([]),
            tags: z.array(z.string()).default([]),
            fonts: fontsSchema,
            theme: z.enum(['golden', 'seasons']).default('golden').optional(),
            layout: z.enum(['grid', 'masonry', 'timeline', 'carousel']).default('grid').optional(),
            photoFit: z.enum(['cover', 'contain', 'auto']).default('cover').optional(),
            background: z.string().optional(),
            accent: z.string().optional(),
            seasonFilter: z.boolean().default(false).optional(),
            seasonDefault: z.enum(['spring', 'summer', 'autumn', 'winter']).optional()
        })
});

const docs = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            subtitle: z.string().optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
            order: z.number().default(99),
            dirs: z.lazy(() =>
                z.array(
                    z.union([
                        z.string(),
                        z.record(
                            z.string(),
                            z.union([z.array(z.string()), z.null(), z.undefined()]).optional()
                        )
                    ])
                )
            ).optional(),
            excerpt: z.string().optional(),
            autoRender: z.boolean().default(true).optional(),
            draft: z.boolean().default(false),
            homepage: z.string().optional(),
            tags: z.array(z.string()).default([]),
            cover: image().optional(),
            banner: imageOrPath(image).optional(),
            splash: z.object({
                enabled: z.boolean().default(false),
                backgroundImage: z.string().optional(),
                overlay: z.string().optional(),
                textShadow: z.boolean().default(true),
                /** Text of the button on the knowledge base cover; when omitted, the page uses the dictionary's "start reading" text in the site's UI language */
                buttonText: z.string().optional(),
                fallbackBg: z.string().optional(),
                gradientColor: z.string().optional(),
                gradientHeight: z.string().default('h-56'),
                backdropBlur: z.string().default('12px'),
                /** Glass effect for splash controls; set only the items to change, the rest comes from the site config splash.glass */
                glass: z.object({
                    nav: z.enum(['solid', 'frosted', 'liquid']).optional(),
                    tint: z.number().min(0).max(1).optional()
                }).optional()
            }).optional()
        })
});

const resume = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/resume' }),
    schema: () =>
        z.object({
            title: z.string(),
            name: z.string(),
            // The line under the name, e.g. "Senior Frontend Engineer"; hidden if omitted
            headline: z.string().optional(),
            avatar: z.string().optional(),
            contact: z.object({
                email: z.string().optional(),
                phone: z.string().optional(),
                location: z.string().optional(),
                website: z.string().optional(),
                // GitHub profile URL, e.g. https://github.com/zhangsan
                github: z.string().optional()
            }).optional(),
            // These fields start out blurred and become readable once the visitor clicks, e.g. [phone, email]
            blur: z.array(z.enum(['name', 'headline', 'email', 'phone', 'location', 'github', 'website'])).default([]),
            // An encrypted resume lets visitors without the password preview a redacted version: in the sections (## headings) listed in redact, each entry's title (###) is covered by a redaction bar;
            // contact fields listed in hide become blurred placeholders. This content is removed at build time, so the page has no original text and visitors cannot reveal it
            preview: z
                .object({
                    redact: z.array(z.string()).default([]),
                    hide: z.array(z.enum(['email', 'phone', 'location', 'github', 'website'])).default(['email', 'phone'])
                })
                .optional(),
            // Setting it turns on encryption: the page holds only ciphertext, viewable once the visitor enters the password or opens a share link (/views/resume/#<token>, where the token is derived from the password).
            // Anyone with the link can view it; it is not a login password, only a way to keep out search engines and casual visitors
            password: z.string().min(1).optional()
        })
});

const thoughts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/thoughts' }),
    schema: () =>
        z.object({
            date: z.coerce.date(),
            tags: z.array(z.string()).default([])
        })
});

const series = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/series' }),
    schema: ({ image }) =>
        z.object({
            name: z.string(),
            description: z.string().optional(),
            cover: imageOrPath(image).optional(),
            icon: z.string().optional(),
            /**
             * This series' post directory, relative to src/content/blog/; must be a single-level directory.
             * Once set, posts in that directory automatically belong to this series, without setting series in each post.
             * The directory name is not part of the URL; post URLs are still /blog/<filename>/.
             */
            dir: z
                .string()
                .optional()
                .refine((v) => !v || !v.includes('/'), { message: t.build.seriesDirNested })
        })
});

export const collections = { blog, pages, projects, albums, docs, resume, thoughts, series };
