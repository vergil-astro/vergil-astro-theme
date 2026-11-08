/**
 * Appearance registry: finds the enabled skins and schemes by name, validates them, and hands them to the pages.
 *
 * Works like zsh plugins: put the skin directory at skins/<name>/ in the site root, then add its name to skins in identity.ts;
 * the classic skin and its schemes A–I and K are built in and need no entry. Every skin ships with at least one scheme, under a skin visitors can only pick that skin's own schemes,
 * and there are no standalone scheme packages.
 *
 * A skin directory holds only data and styles, which the build reads but never executes:
 *   skins/<name>/skin.json         display name, default scheme, list of bundled schemes
 *   skins/<name>/skin.css          style entry point
 *   skins/<name>/schemes/<id>.css  bundled schemes, one file each, named by scheme ID
 *
 * The registry is exposed through two virtual modules:
 *   virtual:vergil/appearance         list of skins and schemes (plain data), read by the panel, the switcher script, and the first-paint script
 *   virtual:vergil/appearance-styles  imports the CSS of the enabled skins and schemes in order; disabled ones stay out of the build
 *
 * A listed name whose directory does not exist is skipped with a warning and the site builds as usual; a directory with wrong contents fails the build, naming the file and field.
 * For the format and the hooks and variables a skin can rely on, see the docs page on the skin and color scheme contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import contract from './contract.json' with { type: 'json' };
import zhCN from '../i18n/zh-CN';
import { builtinSkins, builtinSchemes } from './builtin.mjs';

const DATA_ID = 'virtual:vergil/appearance';
const STYLES_ID = 'virtual:vergil/appearance-styles';

/** Skin names and scheme IDs end up in directory paths, CSS selectors, and HTML attributes, so only lowercase letters, digits, and hyphens are allowed */
const NAME_RE = /^[a-z][a-z0-9-]{0,31}$/;
/** Short label shown under the color dot on the panel */
const SHORT_RE = /^[A-Za-z0-9]{1,2}$/;
/** Dot and icon colors are written into a style attribute, so only a hex color or a single CSS variable is accepted */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|var\(--[a-z0-9-]+\))$/;

class AppearanceError extends Error {
    /** @param {Messages} msg @param {string} message */
    constructor(msg, message) {
        super(`${msg.prefix} ${message}`);
        this.name = 'AppearanceError';
    }
}

/** @typedef {typeof zhCN.build.appearance} Messages */

/**
 * @param {{ skins?: string[], messages?: Messages }} options the skin names enabled in identity.ts, and the build messages
 *   in the site's UI language (src/integration.ts passes t.build.appearance; the Chinese base dictionary is the fallback)
 */
export default function appearance(options = {}) {
    const msg = options.messages ?? zhCN.build.appearance;
    return {
        name: 'vergil-appearance',
        hooks: {
            'astro:config:setup': ({ config, updateConfig, addWatchFile, logger }) => {
                const root = fileURLToPath(config.root);
                const registry = buildRegistry(root, options, logger, msg);
                // Changes to skin.json need a dev server restart to re-register; CSS changes go through normal hot reload
                for (const file of registry.watchFiles) addWatchFile(file);
                updateConfig({ vite: { plugins: [appearanceVitePlugin(registry)] } });
            },
        },
    };
}

function appearanceVitePlugin(registry) {
    return {
        name: 'vergil-appearance',
        resolveId(id) {
            if (id === DATA_ID || id === STYLES_ID) return `\0${id}`;
            return undefined;
        },
        load(id) {
            if (id === `\0${DATA_ID}`) {
                return [
                    `export const contract = ${JSON.stringify(contract.version)};`,
                    `export const skins = ${JSON.stringify(registry.skins)};`,
                    `export const schemes = ${JSON.stringify(registry.schemes)};`,
                ].join('\n');
            }
            if (id === `\0${STYLES_ID}`) {
                return registry.styles.map((file) => `import ${JSON.stringify(file)};`).join('\n');
            }
            return undefined;
        },
    };
}

function buildRegistry(root, options, logger, msg) {
    const skins = builtinSkins.map(({ name, labels, recommendedScheme, schemes }) => ({ name, labels, recommendedScheme, schemes: [...schemes] }));
    const schemes = builtinSchemes.map(({ id, short, labels, swatch, icon }) => ({ id, short, labels, swatch, icon }));
    const styles = [];
    const watchFiles = [];

    const addScheme = (scheme, where) => {
        if (schemes.some((s) => s.id === scheme.id)) {
            throw new AppearanceError(msg, msg.duplicateScheme(where, scheme.id));
        }
        schemes.push(scheme);
    };

    for (const name of readNameList(options.skins, 'skins', logger, msg)) {
        if (skins.some((s) => s.name === name)) {
            logger.warn(name === 'classic' ? msg.builtinSkinListed : msg.duplicateName('skins', name));
            continue;
        }
        const dir = resolvePackageDir(root, 'skins', name, msg);
        if (!dir) {
            logger.warn(msg.skinNotInstalled(name));
            continue;
        }
        const where = `skins/${name}/skin.json`;
        const manifestPath = path.join(dir, 'skin.json');
        const manifest = readManifest(manifestPath, where, msg);
        watchFiles.push(manifestPath);

        const skinCss = requireFile(dir, 'skin.css', `skins/${name}/skin.css`, msg);
        styles.push(toRootPath(root, skinCss));

        // Under this skin visitors can only pick its bundled schemes, so it needs at least one
        const ownSchemes = manifest.schemes;
        if (!Array.isArray(ownSchemes) || !ownSchemes.length) {
            throw new AppearanceError(msg, msg.noSchemes(where));
        }
        const ids = [];
        ownSchemes.forEach((entry, i) => {
            const at = msg.schemeAt(where, i);
            if (!entry || typeof entry !== 'object') throw new AppearanceError(msg, msg.notObject(at));
            if (typeof entry.id !== 'string' || !NAME_RE.test(entry.id)) {
                throw new AppearanceError(msg, msg.invalidSchemeId(at));
            }
            const scheme = readSchemeFields(entry, at, entry.id, msg);
            if (schemes.some((s) => ids.includes(s.id) && s.short === scheme.short)) {
                throw new AppearanceError(msg, msg.duplicateShort(at, scheme.short));
            }
            addScheme(scheme, at);
            ids.push(entry.id);
            const css = requireFile(dir, path.join('schemes', `${entry.id}.css`), `skins/${name}/schemes/${entry.id}.css`, msg);
            styles.push(toRootPath(root, css));
        });

        // Default scheme: applied when a visitor switches to this skin; the first one if omitted
        const recommendedScheme = manifest.recommendedScheme ?? ids[0];
        if (typeof recommendedScheme !== 'string' || !ids.includes(recommendedScheme)) {
            throw new AppearanceError(msg, msg.badRecommendedScheme(where, ids));
        }
        skins.push({ name, labels: readLabels(manifest.labels, where, name, msg), recommendedScheme, schemes: ids });
    }

    return { skins, schemes, styles, watchFiles };
}

/** Name list from identity.ts: must be an array, names may only use safe characters, and duplicates count once */
function readNameList(list, field, logger, msg) {
    if (list === undefined) return [];
    if (!Array.isArray(list)) throw new AppearanceError(msg, msg.notNameArray(field));
    const names = [];
    for (const name of list) {
        if (typeof name !== 'string' || !NAME_RE.test(name)) {
            throw new AppearanceError(msg, msg.invalidName(field, String(JSON.stringify(name))));
        }
        if (names.includes(name)) {
            logger.warn(msg.duplicateName(field, name));
            continue;
        }
        names.push(name);
    }
    return names;
}

/** skins/<name>/. Returns null if the directory does not exist; symlinks pointing outside are always rejected */
function resolvePackageDir(root, kind, name, msg) {
    const base = path.join(root, kind);
    const dir = path.join(base, name);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
    const realBase = fs.realpathSync(base);
    const realDir = fs.realpathSync(dir);
    if (!realDir.startsWith(realBase + path.sep)) {
        throw new AppearanceError(msg, msg.outsideDir(kind, name));
    }
    return realDir;
}

function readManifest(file, where, msg) {
    if (!fs.existsSync(file)) throw new AppearanceError(msg, msg.missingFile(where));
    let data;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        throw new AppearanceError(msg, msg.invalidJson(where, error.message));
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppearanceError(msg, msg.notObject(where));
    if (data.contract !== contract.version) {
        throw new AppearanceError(msg, msg.contractMismatch(where, String(JSON.stringify(data.contract)), contract.version));
    }
    return data;
}

function readSchemeFields(entry, where, id, msg) {
    if (typeof entry.short !== 'string' || !SHORT_RE.test(entry.short)) {
        throw new AppearanceError(msg, msg.invalidShort(where));
    }
    if (typeof entry.swatch !== 'string' || !COLOR_RE.test(entry.swatch)) {
        throw new AppearanceError(msg, msg.invalidSwatch(where));
    }
    const icon = entry.icon ?? entry.swatch;
    if (typeof icon !== 'string' || !COLOR_RE.test(icon)) {
        throw new AppearanceError(msg, msg.invalidIcon(where));
    }
    return { id, short: entry.short, labels: readLabels(entry.labels, where, id, msg), swatch: entry.swatch, icon };
}

/** Display names: { "zh-CN": "...", "en": "..." }, with at least one language */
function readLabels(labels, where, fallback, msg) {
    if (labels === undefined) return { en: fallback };
    if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
        throw new AppearanceError(msg, msg.invalidLabels(where));
    }
    const out = {};
    for (const [lang, text] of Object.entries(labels)) {
        if (typeof text !== 'string' || !text.trim() || text.length > 40) {
            throw new AppearanceError(msg, msg.invalidLabel(where, lang));
        }
        out[lang] = text.trim();
    }
    if (!Object.keys(out).length) out.en = fallback;
    return out;
}

function requireFile(dir, relative, where, msg) {
    const file = path.join(dir, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new AppearanceError(msg, msg.missingFile(where));
    return file;
}

/** Paths handed to Vite are written as /skins/... relative to the site root */
function toRootPath(root, file) {
    const relative = path.relative(fs.realpathSync(root), file);
    return '/' + relative.split(path.sep).join('/');
}
