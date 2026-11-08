/**
 * UI text the site overrides in uiText in identity.ts, applied on top of the theme's own dictionary: the site's text where set, the theme's text everywhere else.
 * The theme is installed as an npm package, so a site cannot edit the dictionary files directly; to change some wording (e.g. the sidebar signature on the moments page), put it in uiText.
 *
 * Merges object by object, level by level. Keys missing from the dictionary (most likely typos) are ignored; so are mismatched types, e.g. when the dictionary has
 * a function that builds a sentence from arguments and the site wrote a string, using it as is would fail the build, so the theme's version is kept.
 */
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends (...args: never[]) => unknown
        ? T[K]
        : T[K] extends object
          ? DeepPartial<T[K]>
          : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeText<T>(base: T, override: unknown): T {
    if (!isPlainObject(base) || !isPlainObject(override)) return base;
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (!(key in merged)) continue;
        const current = merged[key];
        if (isPlainObject(current)) {
            merged[key] = mergeText(current, value);
        } else if (typeof value === typeof current) {
            merged[key] = value;
        }
    }
    return merged as T;
}
