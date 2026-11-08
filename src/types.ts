/// <reference types="astro/client" />

import type zhCN from './i18n/zh-CN';
import type { DeepPartial } from './i18n/merge';

/**
 * UI text overridden by the site: same structure as the theme's UI text dictionary (src/i18n/zh-CN.ts), listing only the lines to change,
 * e.g. { page: { moments: { signature: '……' } } }. Anything left out uses the theme's text
 */
export type UiText = DeepPartial<typeof zhCN>;

export type ImageInput = {
    src: ImageMetadata | string;
    alt?: string;
    caption?: string;
};

export type NavChild = {
    label: string;
    href: string;
    icon?: string;
};

export type NavItem = {
    label: string;
    icon: string;
    href?: string;
    children?: NavChild[];
};

export type Link = {
    text: string;
    href: string;
};

export type SiteLabel = {
    name: string;
    color: string;
};

export type SiteItem = {
    title: string;
    url: string;
    description?: string;
    icon?: string;
    cover?: string;
    labels?: SiteLabel[];
};

export type SiteConfigLinks = Record<string, SiteItem[]>;

export type Hero = {
    title?: string;
    text?: string;
    image?: ImageInput;
    actions?: Link[];
    titleIcon?: string;
    textIcon?: string;
};

export type SubscribeForm = {
    action: string;
    emailFieldName?: string;
    hiddenFields?: { name: string; value: string }[];
    honeypotFieldName?: string;
};

export type Subscribe = {
    enabled?: boolean;
    title?: string;
    text?: string;
    form?: SubscribeForm;
};

/** Style of splash page controls: solid is plain, frosted is frosted glass, liquid is liquid glass */
export type SplashGlassStyle = 'solid' | 'frosted' | 'liquid';

/**
 * Glass effect for splash page controls. Items left out are treated as solid; without a background image everything falls back to solid.
 * Liquid glass has edge refraction in Chromium-based browsers and is clear glass in Safari and Firefox.
 * A knowledge base's _meta.md can also set splash.glass with only the items to change; the rest comes from the site config here.
 */
export type SplashGlassConfig = {
    /** The nav pill on the home page; the start-reading button on knowledge base covers */
    nav?: SplashGlassStyle;
    /** Glass tint strength, default 0.1: higher is more opaque, 0 is fully transparent. For blur, brightening, and other details see the top of styles/components/splash.css */
    tint?: number;
};

export type SplashConfig = {
    enabled?: boolean;
    backgroundImage?: string | string[];
    overlay?: string;
    textShadow?: boolean;
    /** Fallback background color when there is no background image, default bg-main */
    fallbackBg?: string;
    /** End color of the bottom gradient, follows the theme color by default */
    gradientColor?: string;
    /** Height of the bottom gradient, default h-56 */
    gradientHeight?: string;
    /** Frosted blur strength of the bottom gradient, default 12px */
    backdropBlur?: string;
    /** How long each carousel slide stays (seconds), default 18 */
    slideDuration?: number;
    title?: string;
    subtitle?: string;
    description?: string;
    nav?: { text: string; href: string; icon?: string }[];
    /** Glass effect for each control on the splash page; see SplashGlassConfig */
    glass?: SplashGlassConfig;
};

export type FontConfig = {
    display?: string;
    body?: string;
    ui?: string;
    mono?: string;
};

export type IcpRecord = {
    text: string;
    href?: string;
};

export type SiteConfig = {
    website: string;
    /** Site launch date YYYY-MM-DD; if empty, the publish date of the earliest non-draft post is used */
    startDate?: string;
    /** ICP filing info; hidden if empty */
    icp?: IcpRecord[];
    /** Language of the theme's UI text; see src/i18n */
    locale?: string;
    /** Override a few lines of the theme's UI text; see UiText */
    uiText?: UiText;
    /** Which UI skin to use when the visitor has not picked one; see src/utils/skin.ts */
    skin?: string;
    /** Names of enabled skins, matching skins/<name>/ in the site root */
    skins?: string[];
    fonts: FontConfig;
    avatar?: ImageInput;
    title: string;
    subtitle?: string;
    description: string;
    image?: ImageInput;
    headerNavLinks?: NavItem[];
    footerNavLinks?: Link[];
    hero?: Hero;
    subscribe?: Subscribe;
    postsPerPage?: number;
    projectsPerPage?: number;
    comments?: {
        enabled: boolean;
        provider: 'giscus' | 'artalk';
        giscus?: {
            repo: string;
            repoId: string;
            category: string;
            categoryId: string;
            mapping?: 'pathname' | 'url' | 'title' | 'og:title';
            strict?: boolean;
            reactionsEnabled?: boolean;
            emitMetadata?: boolean;
            inputPosition?: 'top' | 'bottom';
            theme?: string;
            lang?: string;
            loading?: 'lazy' | 'eager';
        };
        artalk?: {
            server: string;
            site?: string;
            /** Artalk UI language, e.g. 'zh-CN' or 'en'; defaults to the site's UI language */
            locale?: string;
        };
    };
    splash?: SplashConfig;
    agent?: AgentConfig;
    views?: {
        default: { name: string; path: string };
        resume: { name: string; path: string };
        minimal: { name: string; path: string; enabled?: boolean };
    };
    /** Social icons at the bottom of the left sidebar. If empty, only RSS and Moments are shown. */
    socials?: { github?: string };
    links?: SiteConfigLinks;
    /** Screenshot service for site card covers, default thumio */
    screenshotService?: 'thumio' | 'mshots';
    sidebar?: SidebarConfig;
    floatingAudio?: {
        enabled: boolean;
        autoplay?: boolean;
    };
    tagCloud?: {
        enabled: boolean;
    };
    serviceWorker?: {
        enabled: boolean;
    };
    /** Copyright notice on posts, e.g. "All rights reserved by the author" */
    copyright?: string;
    /** Post sharing */
    share?: {
        enabled: boolean;
    };
    /** Site analytics */
    analytics?: AnalyticsConfig;
};

export type AnalyticsModule = 'overview' | 'trends' | 'pages' | 'referrers' | 'devices' | 'locations' | 'realtime';

export type UmamiAnalyticsConfig = {
    websiteId: string;
    scriptUrl: string;
    apiHost: string;
    apiToken: string;
    statsPage?: {
        path?: string;
        modules?: AnalyticsModule[];
        defaultRange?: 'today' | '7d' | '30d' | 'year';
    };
};

export type AnalyticsConfig = {
    enabled: boolean;
    provider: 'umami';
    umami: UmamiAnalyticsConfig;
};

export type AgentProvider = 'rive' | 'live2d';

export type AgentConfig = {
    enabled?: boolean;
    provider: AgentProvider;
    name?: string;
    rive?: {
        src: string;
        stateMachine?: string;
    };
    live2d?: {
        modelPath: string;
        /**
         * URL of the live2d-widget script; by default a pinned version is loaded from jsDelivr (with an integrity check).
         * To self-host, put L2Dwidget.min.js and L2Dwidget.0.min.js in the same directory under public/ and set the former's URL here
         */
        widgetSrc?: string;
    };
};

export type Album = {
    id: string;
    title: string;
    description?: string;
    cover?: ImageInput;
    images: ImageInput[];
    date?: Date;
    tags?: string[];
};

export type MemoAction = {
    text: string;
    href: string;
    icon?: string;
    external?: boolean;
};

export type MemoItem = {
    title?: string;
    paragraphs?: string[];
    quote?: string;
    actions?: MemoAction[];
};

export type SidebarComponentConfig = {
    recentPosts?: { limit?: number };
    featured?: { limit?: number };
    tags?: { limit?: number };
    related?: { limit?: number };
    ghCard?: {
        mode: 'repo' | 'user';
        repo?: string;
        user?: string;
        bio?: string;
    };
    // Allow any custom sticky-note card or other component config
    [key: string]: unknown;
};

export type SidebarNavItem = {
    label: string;
    href: string;
    icon: string;
};

export type SidebarConfig = {
    left?: string[];
    right?: string[];
    postRight?: string[];
    docRight?: string[];
    components?: SidebarComponentConfig;
    nav?: SidebarNavItem[];
};
