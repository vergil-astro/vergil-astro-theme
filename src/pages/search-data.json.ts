import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

function getDocUrl(id: string): string {
    const parts = id.split('/');
    const docId = parts[0];
    const slug = parts.slice(1).join('/').replace(/\/index$/, '');
    return `/docs/${docId}/${slug}/`;
}

/**
 * Markdown and directive syntax in the body is useless for search and dilutes matches.
 * Strip it here and keep only readable text, which also keeps the index smaller.
 */
function toPlainText(body: string): string {
    return body
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^:{3,}\w*\{[^}]*\}\s*$/gm, ' ')
        .replace(/^:{3,}\s*$/gm, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_`>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Body length cap per entry. Without truncation, a few very long sample posts would bloat the index;
 * but the cap must sit well above typical body length, or the middle and end of posts become unsearchable.
 * It used to be 2000, which indexed only a short opening chunk.
 */
const MAX_CONTENT = 20000;

const entry = (o: Record<string, unknown>) => ({ date: null, tags: [], ...o });

export const GET: APIRoute = async () => {
    const posts = await getCollection('blog', ({ data }) => !data.draft);
    const projects = await getCollection('projects');
    const docs = await getCollection('docs', ({ data }) => !data.draft);
    const thoughts = await getCollection('thoughts');
    const albums = await getCollection('albums');
    const series = await getCollection('series');
    const pages = await getCollection('pages');

    // Moments are loose JSON files, not a content collection, so the directory has to be read directly
    const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');
    const moments: { date: string; content: string; tags?: string[] }[] = [];
    if (fs.existsSync(momentsDir)) {
        for (const file of fs.readdirSync(momentsDir).filter((f) => f.endsWith('.json'))) {
            try {
                moments.push(JSON.parse(fs.readFileSync(path.join(momentsDir, file), 'utf-8')));
            } catch {
                /* A single broken entry should not fail the whole index build */
            }
        }
    }

    const searchData = [
        ...posts.map((post) =>
            entry({
                id: post.id,
                // Posts may sit in a series directory, which is not part of the URL, so compute the URL for the frontend
                url: `/blog/${post.id.split('/').pop()}/`,
                title: post.data.title,
                description: post.data.excerpt || '',
                content: toPlainText(post.body || '').slice(0, MAX_CONTENT),
                type: 'post',
                date: post.data.publishDate,
                tags: post.data.tags || []
            })
        ),
        ...projects.map((project) =>
            entry({
                id: project.id,
                title: project.data.title,
                description: project.data.description || '',
                content: toPlainText(project.body || '').slice(0, MAX_CONTENT),
                type: 'project',
                date: project.data.publishDate
            })
        ),
        ...docs
            .filter((doc) => !doc.id.endsWith('/_meta') && doc.id !== '_meta')
            .map((doc) =>
                entry({
                    id: doc.id,
                    url: getDocUrl(doc.id),
                    title: doc.data.title,
                    description: doc.data.excerpt || doc.data.description || '',
                    content: toPlainText(doc.body || '').slice(0, MAX_CONTENT),
                    type: 'doc',
                    tags: doc.data.tags || []
                })
            ),
        // Thoughts and moments only have list pages, no individual routes, so they all point to the list page
        ...thoughts.map((thought) =>
            entry({
                id: thought.id,
                url: '/thoughts/',
                title: toPlainText(thought.body || '').slice(0, 40),
                description: '',
                content: toPlainText(thought.body || '').slice(0, MAX_CONTENT),
                type: 'thought',
                date: thought.data.date,
                tags: thought.data.tags || []
            })
        ),
        ...moments.map((moment, i) =>
            entry({
                id: `moment-${i}`,
                url: '/moments/',
                title: (moment.content || '').replace(/\s+/g, ' ').slice(0, 40),
                description: '',
                content: (moment.content || '').replace(/\s+/g, ' ').slice(0, MAX_CONTENT),
                type: 'moment',
                date: moment.date,
                tags: moment.tags || []
            })
        ),
        ...albums.map((album) =>
            entry({
                id: album.id,
                url: `/albums/${album.id}/`,
                title: album.data.title,
                description: album.data.description || '',
                content: toPlainText(album.body || '').slice(0, MAX_CONTENT),
                type: 'album',
                date: album.data.date,
                tags: album.data.tags || []
            })
        ),
        ...series.map((s) =>
            entry({
                id: s.id,
                url: `/series/${s.id}/`,
                title: s.data.name,
                description: s.data.description || '',
                content: toPlainText(s.body || '').slice(0, MAX_CONTENT),
                type: 'series'
            })
        ),
        ...pages.map((page) =>
            entry({
                id: page.id,
                url: `/${page.id}/`,
                title: page.data.title,
                description: page.data.seo?.description || '',
                content: toPlainText(page.body || '').slice(0, MAX_CONTENT),
                type: 'page'
            })
        )
    ];

    return new Response(JSON.stringify(searchData), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};
