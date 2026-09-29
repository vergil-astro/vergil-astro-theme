import { glob } from 'astro/loaders';
import { defineCollection, z, type ImageFunction } from 'astro:content';

const imageSchema = (image: ImageFunction) =>
    z.object({
        src: image(),
        alt: z.string().optional()
    });

/**
 * 内容里的封面图：推荐写 @img/ 别名指向 src/assets/img/ 下的文件，会被优化；
 * 也兼容 / 开头的 public 路径和外链，那两种原样输出。
 *
 * 字符串分支必须排在前面：image() 遇到 / 开头的路径会直接报「图片不存在」，
 * 不会让给后面的分支。
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
            /** 机型。演示内容一直在写这个字段，但 schema 里漏了，zod 会静默丢弃 */
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
                buttonText: z.string().default('开始阅读'),
                fallbackBg: z.string().optional(),
                gradientColor: z.string().optional(),
                gradientHeight: z.string().default('h-56'),
                backdropBlur: z.string().default('12px')
            }).optional()
        })
});

const resume = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/resume' }),
    schema: () =>
        z.object({
            title: z.string(),
            name: z.string(),
            avatar: z.string().optional(),
            contact: z.object({
                email: z.string().optional(),
                phone: z.string().optional(),
                location: z.string().optional(),
                website: z.string().optional()
            }).optional()
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
             * 这个专栏的文章目录，相对于 src/content/blog/，只能是一级目录。
             * 填了之后该目录下的文章自动属于本专栏，不必每篇再写 series。
             * 目录名不参与 URL，文章地址仍然是 /blog/<文件名>/。
             */
            dir: z
                .string()
                .optional()
                .refine((v) => !v || !v.includes('/'), { message: 'dir 只能填一级目录，不要带斜杠' })
        })
});

export const collections = { blog, pages, projects, albums, docs, resume, thoughts, series };
