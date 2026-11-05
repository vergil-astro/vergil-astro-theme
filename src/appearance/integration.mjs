/**
 * 外观注册：按名字找到启用的皮肤和配色，校验后交给页面使用。
 *
 * 用法像 zsh 的插件：把皮肤目录放进站点根目录的 skins/<名字>/，再在 identity.ts 的 skins 里写上名字；
 * 经典皮肤和配色 A–I、K 是内置的，不用写。内置之外的配色只能由皮肤自带，没有单独的配色包。
 *
 * 皮肤目录里只有数据和样式，构建时只读不执行：
 *   skins/<名字>/skin.json         显示名、推荐配色、自带的配色列表
 *   skins/<名字>/skin.css          样式入口
 *   skins/<名字>/schemes/<id>.css  自带配色，每套一个文件，文件名就是配色 ID
 *
 * 注册结果通过两个虚拟模块提供：
 *   virtual:vergil/appearance         皮肤和配色的列表（纯数据），面板、切换脚本、首屏脚本都从这里读
 *   virtual:vergil/appearance-styles  依次引入启用的皮肤和配色的 CSS，没启用的不会进构建
 *
 * 写了名字但目录不存在，跳过并警告，站点照常构建；目录存在但内容不对，构建直接失败并指出是哪个文件、哪个字段。
 * 格式和皮肤能依赖的挂钩、变量见文档「皮肤与配色接口」。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import contract from './contract.json' with { type: 'json' };
import { builtinSkins, builtinSchemes, fallbackScheme } from './builtin.mjs';

const DATA_ID = 'virtual:vergil/appearance';
const STYLES_ID = 'virtual:vergil/appearance-styles';

/** 皮肤名、配色 ID：会写进目录路径、CSS 选择器和 HTML 属性，只允许小写字母、数字和短横 */
const NAME_RE = /^[a-z][a-z0-9-]{0,31}$/;
/** 面板色点下面显示的短标记 */
const SHORT_RE = /^[A-Za-z0-9]{1,2}$/;
/** 色点和图标的颜色会写进 style 属性，只接受十六进制色值或一个 CSS 变量 */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|var\(--[a-z0-9-]+\))$/;

class AppearanceError extends Error {
    constructor(message) {
        super(`[vergil 外观] ${message}`);
        this.name = 'AppearanceError';
    }
}

/**
 * @param {{ skins?: string[] }} options identity.ts 里启用的皮肤名
 */
export default function appearance(options = {}) {
    return {
        name: 'vergil-appearance',
        hooks: {
            'astro:config:setup': ({ config, updateConfig, addWatchFile, logger }) => {
                const root = fileURLToPath(config.root);
                const registry = buildRegistry(root, options, logger);
                // skin.json 改了要重启开发服务器才能重新注册；CSS 改了走正常的热更新
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

function buildRegistry(root, options, logger) {
    const skins = builtinSkins.map(({ name, labels, recommendedScheme }) => ({ name, labels, recommendedScheme }));
    const schemes = builtinSchemes.map(({ id, short, labels, swatch, icon }) => ({ id, short, labels, swatch, icon }));
    const styles = [];
    const watchFiles = [];

    const addScheme = (scheme, where) => {
        if (schemes.some((s) => s.id === scheme.id)) {
            throw new AppearanceError(`${where}：配色 ID "${scheme.id}" 已经被别的皮肤或配色用了，换一个名字`);
        }
        schemes.push(scheme);
    };

    for (const name of readNameList(options.skins, 'skins', logger)) {
        if (skins.some((s) => s.name === name)) {
            logger.warn(name === 'classic' ? 'classic 是内置皮肤，不用写进 skins' : `skins 里 "${name}" 写了两遍`);
            continue;
        }
        const dir = resolvePackageDir(root, 'skins', name);
        if (!dir) {
            logger.warn(`皮肤 "${name}" 没有安装，已跳过：请把它放到 skins/${name}/`);
            continue;
        }
        const where = `skins/${name}/skin.json`;
        const manifestPath = path.join(dir, 'skin.json');
        const manifest = readManifest(manifestPath, where);
        watchFiles.push(manifestPath);

        const skinCss = requireFile(dir, 'skin.css', `skins/${name}/skin.css`);
        styles.push(toRootPath(root, skinCss));

        const ownSchemes = manifest.schemes ?? [];
        if (!Array.isArray(ownSchemes)) throw new AppearanceError(`${where}：schemes 应该是数组`);
        ownSchemes.forEach((entry, i) => {
            const at = `${where} 的 schemes[${i}]`;
            if (!entry || typeof entry !== 'object') throw new AppearanceError(`${at} 应该是一个对象`);
            if (typeof entry.id !== 'string' || !NAME_RE.test(entry.id)) {
                throw new AppearanceError(`${at}.id 不合法：只能用小写字母、数字和短横，以字母开头`);
            }
            addScheme(readSchemeFields(entry, at, entry.id), at);
            const css = requireFile(dir, path.join('schemes', `${entry.id}.css`), `skins/${name}/schemes/${entry.id}.css`);
            styles.push(toRootPath(root, css));
        });

        const recommendedScheme = manifest.recommendedScheme ?? fallbackScheme;
        if (typeof recommendedScheme !== 'string') throw new AppearanceError(`${where}：recommendedScheme 应该是字符串`);
        skins.push({ name, labels: readLabels(manifest.labels, where, name), recommendedScheme });
    }

    // 推荐配色可以是内置的、自己带的，也可以是另一个已启用的皮肤带的，所以等全部注册完再检查
    for (const skin of skins) {
        if (!schemes.some((s) => s.id === skin.recommendedScheme)) {
            throw new AppearanceError(`皮肤 "${skin.name}" 推荐的配色 "${skin.recommendedScheme}" 没有注册`);
        }
    }

    return { skins, schemes, styles, watchFiles };
}

/** identity.ts 里的名字列表：必须是数组，名字只能用安全字符，重复的只算一次 */
function readNameList(list, field, logger) {
    if (list === undefined) return [];
    if (!Array.isArray(list)) throw new AppearanceError(`identity.ts 的 ${field} 应该是名字数组，比如 ['island']`);
    const names = [];
    for (const name of list) {
        if (typeof name !== 'string' || !NAME_RE.test(name)) {
            throw new AppearanceError(`identity.ts 的 ${field} 里 ${JSON.stringify(name)} 不是合法的名字：只能用小写字母、数字和短横，以字母开头`);
        }
        if (names.includes(name)) {
            logger.warn(`${field} 里 "${name}" 写了两遍`);
            continue;
        }
        names.push(name);
    }
    return names;
}

/** skins/<名字>/。目录不存在返回 null；软链接指到外面去的一律拒绝 */
function resolvePackageDir(root, kind, name) {
    const base = path.join(root, kind);
    const dir = path.join(base, name);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
    const realBase = fs.realpathSync(base);
    const realDir = fs.realpathSync(dir);
    if (!realDir.startsWith(realBase + path.sep)) {
        throw new AppearanceError(`${kind}/${name} 指向了 ${kind}/ 以外的位置，出于安全考虑不加载`);
    }
    return realDir;
}

function readManifest(file, where) {
    if (!fs.existsSync(file)) throw new AppearanceError(`缺少 ${where}`);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        throw new AppearanceError(`${where} 不是合法的 JSON：${error.message}`);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppearanceError(`${where} 应该是一个对象`);
    if (data.contract !== contract.version) {
        throw new AppearanceError(`${where} 的 contract 是 ${JSON.stringify(data.contract)}，当前 Vergil 的外观接口版本是 ${contract.version}，两边要一致`);
    }
    return data;
}

function readSchemeFields(entry, where, id) {
    if (typeof entry.short !== 'string' || !SHORT_RE.test(entry.short)) {
        throw new AppearanceError(`${where}：short 是色点下面显示的 1～2 个字母或数字`);
    }
    if (typeof entry.swatch !== 'string' || !COLOR_RE.test(entry.swatch)) {
        throw new AppearanceError(`${where}：swatch 只接受十六进制色值（如 #a9521f）或一个 CSS 变量（如 var(--text-main)）`);
    }
    const icon = entry.icon ?? entry.swatch;
    if (typeof icon !== 'string' || !COLOR_RE.test(icon)) {
        throw new AppearanceError(`${where}：icon 只接受十六进制色值或一个 CSS 变量`);
    }
    return { id, short: entry.short, labels: readLabels(entry.labels, where, id), swatch: entry.swatch, icon };
}

/** 显示名：{ "zh-CN": "...", "en": "..." }，至少写一种语言 */
function readLabels(labels, where, fallback) {
    if (labels === undefined) return { en: fallback };
    if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
        throw new AppearanceError(`${where}：labels 应该是 { "zh-CN": "...", "en": "..." } 这样的对象`);
    }
    const out = {};
    for (const [lang, text] of Object.entries(labels)) {
        if (typeof text !== 'string' || !text.trim() || text.length > 40) {
            throw new AppearanceError(`${where}：labels.${lang} 应该是 1～40 个字的字符串`);
        }
        out[lang] = text.trim();
    }
    if (!Object.keys(out).length) out.en = fallback;
    return out;
}

function requireFile(dir, relative, where) {
    const file = path.join(dir, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new AppearanceError(`缺少 ${where}`);
    return file;
}

/** 交给 Vite 的路径写成相对站点根目录的 /skins/... 形式 */
function toRootPath(root, file) {
    const relative = path.relative(fs.realpathSync(root), file);
    return '/' + relative.split(path.sep).join('/');
}
