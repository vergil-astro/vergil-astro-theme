/**
 * Background videos bundled with the album themes, kept in src/assets/videos/ and output to /_astro/ with a content hash at build time.
 *
 * Collected with glob instead of a direct import: pnpm reset deletes these videos, after which this gets
 * undefined, the matching <video> shows only its poster image, and the build does not fail over missing files.
 */
const videos = import.meta.glob<string>('/src/assets/videos/*.mp4', { eager: true, query: '?url', import: 'default' });

export function themeVideo(name: string): string | undefined {
    return videos[`/src/assets/videos/${name}`];
}
