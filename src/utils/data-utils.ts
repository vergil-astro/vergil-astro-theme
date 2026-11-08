import { type CollectionEntry } from 'astro:content';
import { slugify } from './common-utils';
import { t } from '../i18n';

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

// Category tree node
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

/** Series definition, from the md files under src/content/series/ */
export type SeriesDef = { id: string; name: string; dir?: string };

/**
 * When a post sits in a subdirectory of src/content/blog/, the directory name is not part of the URL.
 *
 * That way, gathering loose posts into a series directory does not change any published links.
 * The cost is that same-named files in different directories collide on one URL, which assertNoDuplicateSlugs catches.
 */
export function getPostSlug(post: CollectionEntry<'blog'>) {
    return post.id.split('/').pop() as string;
}

export function getPostUrl(post: CollectionEntry<'blog'>, prefix = '/blog') {
    return `${prefix}/${getPostSlug(post)}/`;
}

/** The post's top-level directory, or null if there is none */
export function getPostDir(post: CollectionEntry<'blog'>) {
    const parts = post.id.split('/');
    return parts.length > 1 ? parts[0] : null;
}

/**
 * Directory names are not part of the URL, so blog/a.md and blog/some-series/a.md produce the same URL.
 * This must fail the build: silently overwriting would leave one of the posts permanently unreachable,
 * and auto-adding a suffix would make URLs change as files are added or removed.
 */
export function assertNoDuplicateSlugs(posts: CollectionEntry<'blog'>[]) {
    const seen = new Map<string, string>();
    for (const post of posts) {
        const slug = getPostSlug(post).toLowerCase();
        const previous = seen.get(slug);
        if (previous) {
            throw new Error(t.build.duplicateSlug(getPostSlug(post), previous, post.id));
        }
        seen.set(slug, post.id);
    }
}

/**
 * Determine which series a post belongs to.
 *
 * series in the frontmatter takes priority; if it is not set, check whether a series claims the post's directory via dir.
 * That way, posts of one series can simply go into one folder without repeating series in every post.
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
 * A series is an ordered reading sequence, so posts are returned in ascending publish order, first post first.
 * The blog list's newest-first order would make tutorials read backwards here,
 * and would also reverse the "part N of M" position in the series navigation.
 */
export function getPostsBySeries(posts: CollectionEntry<'blog'>[], seriesId: string, defs: SeriesDef[] = []) {
    return posts
        .filter((p) => resolvePostSeries(p, defs)?.id === seriesId)
        .sort((a, b) => new Date(a.data.publishDate).getTime() - new Date(b.data.publishDate).getTime());
}
