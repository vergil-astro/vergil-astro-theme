/** 外观注册结果，由 src/appearance/integration.mjs 生成 */
declare module 'virtual:vergil/appearance' {
    /** 各语言的显示名，比如 { "zh-CN": "海岛", "en": "Island" } */
    export type AppearanceLabels = Record<string, string>;

    export interface SkinEntry {
        name: string;
        labels: AppearanceLabels;
        /** 访客没选过配色时，这个皮肤用哪套 */
        recommendedScheme: string;
    }

    export interface SchemeEntry {
        id: string;
        /** 面板色点下面显示的短标记 */
        short: string;
        labels: AppearanceLabels;
        /** 面板色点的颜色 */
        swatch: string;
        /** 选中后调色盘图标的颜色 */
        icon: string;
    }

    export const contract: number;
    export const skins: SkinEntry[];
    export const schemes: SchemeEntry[];
}

/** 依次引入启用的皮肤和配色的 CSS */
declare module 'virtual:vergil/appearance-styles' {}
