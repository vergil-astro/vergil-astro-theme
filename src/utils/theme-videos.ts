/**
 * 相册主题自带的背景视频，放在 src/assets/videos/，构建时输出到 /_astro/ 并带内容哈希。
 *
 * 用 glob 收集而不是直接 import：pnpm reset 会删掉这些视频，删掉之后这里拿到的是
 * undefined，对应的 <video> 只显示封面图，构建不会因为找不到文件而失败。
 */
const videos = import.meta.glob<string>('/src/assets/videos/*.mp4', { eager: true, query: '?url', import: 'default' });

export function themeVideo(name: string): string | undefined {
    return videos[`/src/assets/videos/${name}`];
}
