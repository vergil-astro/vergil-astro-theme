import {
    House, Database, Heart, Ellipsis, FolderOpen, BookOpen,
    FileText, Image, Lightbulb, MessageSquare, Clock,
    Link, User, TrainFront, ChevronDown, ChevronRight, Search,
    Menu, X, Wrench, Archive, LayoutGrid, MessageCircle,
    Bookmark, BookText, createLucideIcon, type AstroComponent
} from '@lucide/astro';

/**
 * Lucide 1.0 起不再收录品牌图标，GitHub 图标按 0.x 的线条（ISC 许可）在这里补上，样子和原来一样
 */
export const Github = createLucideIcon({
    name: 'github',
    size: 24,
    node: [
        ['path', { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' }],
        ['path', { d: 'M9 18c-4.51 2-5-2-7-2' }],
    ],
}) as AstroComponent;

export const lucideNavIcons: Record<string, any> = {
    // 导航图标（kebab-case key → PascalCase 组件）。key 是站点配置里写的名字，Lucide 改了名的图标保留旧 key
    'home': House,
    'database': Database,
    'heart': Heart,
    'more-horizontal': Ellipsis,
    'folder-open': FolderOpen,
    'book-open': BookOpen,
    'file-text': FileText,
    'image': Image,
    'lightbulb': Lightbulb,
    'message-square': MessageSquare,
    'clock': Clock,
    'github': Github,
    'link': Link,
    'user': User,
    'train': TrainFront,
    'wrench': Wrench,
    'archive': Archive,
    'layout-grid': LayoutGrid,
    'message-circle': MessageCircle,
    'bookmark': Bookmark,
    'book-text': BookText,
    // 内部固定图标
    'chevron-down': ChevronDown,
    'chevron-right': ChevronRight,
    'search': Search,
    'menu': Menu,
    'x': X,
};
