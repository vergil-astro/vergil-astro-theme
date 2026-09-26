import { type CollectionEntry } from 'astro:content';
import { slugify } from './common-utils';

export function sortItemsByDateDesc(itemA: CollectionEntry<'blog' | 'projects'>, itemB: CollectionEntry<'blog' | 'projects'>) {
    return new Date(itemB.data.publishDate).getTime() - new Date(itemA.data.publishDate).getTime();
}

export function getAllTags(posts: CollectionEntry<'blog'>[]) {
    const tags: string[] = [...new Set(posts.flatMap((post) => post.data.tags || []).filter(Boolean))];
    return tags
        .map((tag) => {
            return {
                name: tag,
                id: slugify(tag)
            };
        })
        .filter((obj, pos, arr) => {
            return arr.map((mapObj) => mapObj.id).indexOf(obj.id) === pos;
        });
}

export function getPostsByTag(posts: CollectionEntry<'blog'>[], tagId: string) {
    const filteredPosts: CollectionEntry<'blog'>[] = posts.filter((post) => (post.data.tags || []).map((tag) => slugify(tag)).includes(tagId));
    return filteredPosts;
}

export function getAllCategories(posts: CollectionEntry<'blog'>[]) {
    const allCats = new Set<string>();
    posts.forEach((post) => {
        const cats = post.data.categories;
        if (!cats) return;
        cats.forEach((cat) => allCats.add(cat));
    });
    return [...allCats].map((cat) => ({
        name: cat,
        id: slugify(cat)
    }));
}

export function getPostsByCategory(posts: CollectionEntry<'blog'>[], categoryId: string) {
    return posts.filter((post) => {
        const cats = post.data.categories;
        if (!cats) return false;
        return cats.some((cat) => slugify(cat) === categoryId);
    });
}

// 分类树节点
export type CategoryNode = {
    name: string;
    id: string;
    count: number;
    children: CategoryNode[];
};

export function buildCategoryTree(posts: CollectionEntry<'blog'>[]): CategoryNode[] {
    const root: CategoryNode[] = [];

    posts.forEach((post) => {
        const cats = post.data.categories;
        if (!cats || cats.length === 0) return;

        let currentChildren = root;
        cats.forEach((catName) => {
            const id = slugify(catName);
            let node = currentChildren.find((n) => n.id === id);
            if (!node) {
                node = { name: catName, id, count: 0, children: [] };
                currentChildren.push(node);
            }
            node.count++;
            currentChildren = node.children;
        });
    });

    return root;
}

export function findCategoryPath(tree: CategoryNode[], targetId: string): CategoryNode[] | null {
    for (const node of tree) {
        if (node.id === targetId) {
            return [node];
        }
        if (node.children.length > 0) {
            const childPath = findCategoryPath(node.children, targetId);
            if (childPath) {
                return [node, ...childPath];
            }
        }
    }
    return null;
}

export function getAllSeries(posts: CollectionEntry<'blog'>[]) {
    const series = [...new Set(posts.map((p) => p.data.series).filter(Boolean))] as string[];
    return series.map((s) => ({ name: s, id: slugify(s) }));
}

/** 专栏定义，来自 src/content/series/ 下的 md 文件 */
export type SeriesDef = { id: string; name: string; dir?: string };

/**
 * 文章放在 src/content/blog/ 的子目录里时，目录名不进 URL。
 *
 * 这样把散落的文章归拢进专栏目录，不会改变任何已经发布的链接。
 * 代价是不同目录下的同名文件会撞同一个地址，由 assertNoDuplicateSlugs 拦下。
 */
export function getPostSlug(post: CollectionEntry<'blog'>) {
    return post.id.split('/').pop() as string;
}

export function getPostUrl(post: CollectionEntry<'blog'>, prefix = '/blog') {
    return `${prefix}/${getPostSlug(post)}/`;
}

/** 文章所在的一级目录，没有则为 null */
export function getPostDir(post: CollectionEntry<'blog'>) {
    const parts = post.id.split('/');
    return parts.length > 1 ? parts[0] : null;
}

/**
 * 目录名不进 URL，所以 blog/a.md 和 blog/某专栏/a.md 会生成同一个地址。
 * 这种情况必须在构建期报错：悄悄覆盖会让其中一篇永远打不开，
 * 而自动加后缀又会让 URL 随着文件增减而变化。
 */
export function assertNoDuplicateSlugs(posts: CollectionEntry<'blog'>[]) {
    const seen = new Map<string, string>();
    for (const post of posts) {
        const slug = getPostSlug(post).toLowerCase();
        const previous = seen.get(slug);
        if (previous) {
            throw new Error(
                `[Vergil] 两篇文章会生成同一个地址 /blog/${getPostSlug(post)}/：\n` +
                    `  src/content/blog/${previous}.md\n` +
                    `  src/content/blog/${post.id}.md\n` +
                    `目录名不参与 URL，所以不同目录下也不能重名。请把其中一篇改名。`
            );
        }
        seen.set(slug, post.id);
    }
}

/**
 * 判断文章属于哪个专栏。
 *
 * 优先看 frontmatter 里的 series；没写的话，看它所在目录有没有被某个专栏用 dir 认领。
 * 这样同一个专栏的文章可以直接丢进一个文件夹，不必每篇都重复写 series。
 */
export function resolvePostSeries(post: CollectionEntry<'blog'>, defs: SeriesDef[]): SeriesDef | undefined {
    if (post.data.series) {
        const id = slugify(post.data.series);
        return defs.find((d) => d.id === id) ?? { id, name: post.data.series };
    }
    const dir = getPostDir(post);
    if (!dir) return undefined;
    return defs.find((d) => d.dir && d.dir.toLowerCase() === dir.toLowerCase());
}

/**
 * 专栏是一个有顺序的阅读序列，所以按发布时间正序返回，第一篇在最前。
 * 博客列表那种「最新在前」的排法用在这里会让教程倒着读，
 * 连带专栏导航里的「第几篇 / 共几篇」也会反过来。
 */
export function getPostsBySeries(posts: CollectionEntry<'blog'>[], seriesId: string, defs: SeriesDef[] = []) {
    return posts
        .filter((p) => resolvePostSeries(p, defs)?.id === seriesId)
        .sort((a, b) => new Date(a.data.publishDate).getTime() - new Date(b.data.publishDate).getTime());
}
