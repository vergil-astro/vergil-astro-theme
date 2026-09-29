#!/usr/bin/env node
/**
 * 规整图片：把内容里引用的本地图片挪到 src/assets/img/<载体>/<内容名>/，
 * 引用改成 @img/ 别名。规则见文档「图片与静态资源」。
 *
 * 处理范围：
 *   - 载体：src/content/ 下的 blog、projects、pages、docs、albums
 *   - 正文里的 Markdown 图片 ![](...)，代码块里的示例不动
 *   - frontmatter 里的 src、cover（seo.image.src、知识库和相册的 cover、相册的 images[].src）
 *
 * 不处理：
 *   - banner、指令、图文动态、想法这些只接受字符串路径的地方（它们本来就该用 public/assets/）
 *   - 外链、已经是 @img/ 的引用
 *
 * 安全措施：
 *   - 不删除任何图片。没被引用的图原地不动
 *   - 同一张图被多条内容引用：移给第一条，其余各复制一份
 *   - 图片还被代码、配置或字符串字段引用：只复制不移动
 *   - 目标位置已有同名但内容不同的文件：自动改名为 xxx-1.png
 *   - 引用的文件不存在：跳过，在最后列出来
 *
 * 执行完会自动跑一次 images:check。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src/content');
const PUBLIC_DIR = path.join(ROOT, 'public');
const IMG_DIR = path.join(ROOT, 'src/assets/img');
const IMG_ALIAS = '@img/';
const CARRIERS = ['blog', 'projects', 'pages', 'docs', 'albums'];
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif']);
const TEXT_EXT = new Set(['.md', '.mdx', '.astro', '.ts', '.js', '.mjs', '.json', '.css', '.html', '.webmanifest']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git']);

const rel = (p) => path.relative(ROOT, p);

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');

/** 内容文件属于哪个载体、图片该放进哪个目录 */
function targetDirOf(file) {
    const parts = path.relative(CONTENT_DIR, file).split(path.sep);
    const carrier = parts[0];
    if (carrier === 'docs') return path.join(IMG_DIR, 'docs', parts[1]);
    const base = path.basename(file).replace(/\.(md|mdx)$/, '');
    const name = base === 'index' && parts.length > 2 ? parts[parts.length - 2] : base;
    return path.join(IMG_DIR, carrier, name);
}

function isCandidate(ref) {
    if (!ref || ref.startsWith(IMG_ALIAS)) return false;
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) return false;
    return IMAGE_EXT.has(path.extname(ref.split(/[?#]/)[0]).toLowerCase());
}

function resolveRef(ref, fromFile) {
    const clean = decodeURI(ref.split(/[?#]/)[0]);
    if (clean.startsWith('/')) return path.join(PUBLIC_DIR, clean);
    return path.resolve(path.dirname(fromFile), clean);
}

// ── 1. 找出所有要处理的引用 ──
const MD_IMAGE = /(!\[[^\]]*\]\(\s*<?)([^)\s>]+)(>?(?:\s+"[^"]*")?\s*\))/g;
const FM_FIELD = /^(\s*-?\s*(?:src|cover):\s*)(['"]?)([^'"\s#]+)\2(\s*)$/;

const contentFiles = CARRIERS.flatMap((c) => walk(path.join(CONTENT_DIR, c))).filter((f) => /\.(md|mdx)$/.test(f));

/** 按行扫描一个内容文件，回调每个可处理的引用，回调返回新值则替换 */
function mapRefs(text, onRef) {
    const lines = text.split('\n');
    let inFrontmatter = lines[0] === '---';
    let fence = null;
    for (let i = inFrontmatter ? 1 : 0; i < lines.length; i++) {
        const line = lines[i];
        if (inFrontmatter) {
            if (line === '---') {
                inFrontmatter = false;
                continue;
            }
            const m = line.match(FM_FIELD);
            if (m && isCandidate(m[3])) {
                const next = onRef(m[3]);
                if (next) lines[i] = `${m[1]}'${next}'${m[4]}`;
            }
            continue;
        }
        const f = line.match(/^\s*(`{3,}|~{3,})/);
        if (fence) {
            if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
            continue;
        }
        if (f) {
            fence = f[1];
            continue;
        }
        // 行内代码 `...` 里的是写法示例，只处理代码之外的部分
        lines[i] = line
            .split(/(`[^`]*`)/)
            .map((part) =>
                part.startsWith('`')
                    ? part
                    : part.replace(MD_IMAGE, (all, head, ref, tail) => {
                          if (!isCandidate(ref)) return all;
                          const next = onRef(ref);
                          return next ? `${head}${next}${tail}` : all;
                      })
            )
            .join('');
    }
    return lines.join('\n');
}

const refsBySource = new Map(); // 源文件 → [{ file, targetDir }]
const missing = [];
for (const file of contentFiles) {
    mapRefs(fs.readFileSync(file, 'utf8'), (ref) => {
        const source = resolveRef(ref, file);
        if (!fs.existsSync(source)) {
            missing.push({ file, ref });
            return null;
        }
        if (!refsBySource.has(source)) refsBySource.set(source, []);
        const list = refsBySource.get(source);
        if (!list.some((r) => r.file === file)) list.push({ file, targetDir: targetDirOf(file) });
        return null;
    });
}

// ── 2. 决定每张图挪到哪 ──
function uniqueTarget(dir, name, source) {
    const ext = path.extname(name);
    const stem = path.basename(name, ext);
    for (let n = 0; ; n++) {
        const candidate = path.join(dir, n === 0 ? name : `${stem}-${n}${ext}`);
        if (!fs.existsSync(candidate)) return { target: candidate, reuse: false };
        if (candidate === source || md5(candidate) === md5(source)) return { target: candidate, reuse: true };
    }
}

const newRef = new Map(); // `${file}\0${source}` → @img/ 路径
const operations = []; // { kind: 'move' | 'copy', from, to }
const plannedTargets = new Set();

for (const [source, refs] of refsBySource) {
    const targetByDir = new Map(); // 同一个目标目录只放一份，比如同一知识库里的几篇文档引用同一张图
    for (const { file, targetDir } of refs) {
        let target = targetByDir.get(targetDir);
        if (target) {
            // 已经排好了，直接复用
        } else if (path.dirname(source) === targetDir) {
            target = source;
        } else {
            const picked = uniqueTarget(targetDir, path.basename(source), source);
            target = picked.target;
            // 同一次运行里前面已经排到这个位置的，也算占用
            while (!picked.reuse && plannedTargets.has(target)) {
                const ext = path.extname(target);
                target = target.replace(new RegExp(`(-(\\d+))?\\${ext}$`), (m, g, d) => `-${(Number(d) || 0) + 1}${ext}`);
            }
            if (!picked.reuse) {
                plannedTargets.add(target);
                operations.push({ kind: 'copy', from: source, to: target });
            }
        }
        targetByDir.set(targetDir, target);
        newRef.set(`${file}\0${source}`, IMG_ALIAS + path.relative(IMG_DIR, target).split(path.sep).join('/'));
    }
}

// ── 3. 改写内容里的引用 ──
const rewritten = new Map(); // file → 新文本
for (const file of contentFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const next = mapRefs(text, (ref) => {
        const source = resolveRef(ref, file);
        return newRef.get(`${file}\0${source}`) || null;
    });
    if (next !== text) rewritten.set(file, next);
}

// ── 4. 能移动的就移动：源文件不再被任何地方引用时，第一份复制改成移动 ──
const corpusFiles = [...walk(path.join(ROOT, 'src')), ...walk(PUBLIC_DIR), path.join(ROOT, 'astro.config.mjs')].filter(
    (f) => TEXT_EXT.has(path.extname(f).toLowerCase()) && fs.existsSync(f)
);
for (const source of refsBySource.keys()) {
    if (stillReferencedElsewhere(source)) continue;
    const first = operations.find((op) => op.from === source && op.kind === 'copy');
    if (first) first.kind = 'move';
}

/** 去掉代码块和行内代码，里面的路径只是写法示例 */
function stripCode(text) {
    const out = [];
    let fence = null;
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*(`{3,}|~{3,})/);
        if (fence) {
            if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
            continue;
        }
        if (m) {
            fence = m[1];
            continue;
        }
        out.push(line.replace(/`[^`]*`/g, ''));
    }
    return out.join('\n');
}

/** 改写之后，源文件的原路径是否还出现在任何文件里（代码、配置、字符串字段等） */
function stillReferencedElsewhere(source) {
    const relToPublic = source.startsWith(PUBLIC_DIR + path.sep) ? '/' + path.relative(PUBLIC_DIR, source).split(path.sep).join('/') : null;
    const name = path.basename(source);
    for (const f of corpusFiles) {
        const raw = rewritten.get(f) ?? fs.readFileSync(f, 'utf8');
        const text = /\.(md|mdx)$/.test(f) ? stripCode(raw) : raw;
        if (!text.includes(name)) continue;
        if (relToPublic && text.includes(relToPublic)) return true;
        // 相对路径引用：看这个文件里是否还有指向源文件的相对路径
        for (const m of text.matchAll(new RegExp(`[("'\\s]([^("'\\s]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'))) {
            const ref = m[1];
            if (ref.startsWith(IMG_ALIAS) || /^(https?:)?\/\//.test(ref)) continue;
            try {
                if (resolveRef(ref, f) === source) return true;
            } catch {
                /* 忽略无法解析的片段 */
            }
        }
    }
    return false;
}

// ── 5. 执行 ──
// 先复制，最后再移动，避免同一张图既要复制又要移动时源文件先没了
for (const op of [...operations.filter((o) => o.kind === 'copy'), ...operations.filter((o) => o.kind === 'move')]) {
    fs.mkdirSync(path.dirname(op.to), { recursive: true });
    if (op.kind === 'move') fs.renameSync(op.from, op.to);
    else fs.copyFileSync(op.from, op.to);
}
for (const [file, text] of rewritten) fs.writeFileSync(file, text, 'utf8');

// ── 6. 报告 ──
const moved = operations.filter((o) => o.kind === 'move');
const copied = operations.filter((o) => o.kind === 'copy');
console.log(`\n移动 ${moved.length} 张，复制 ${copied.length} 张，改写 ${rewritten.size} 个内容文件`);
for (const op of moved) console.log(`  移动  ${rel(op.from)} → ${rel(op.to)}`);
for (const op of copied) console.log(`  复制  ${rel(op.from)} → ${rel(op.to)}`);
for (const file of rewritten.keys()) console.log(`  改写  ${rel(file)}`);
if (missing.length) {
    console.log(`\n跳过 ${missing.length} 处引用，图片文件不存在：`);
    for (const { file, ref } of missing) console.log(`  ${rel(file)} → ${ref}`);
}
if (operations.length === 0 && rewritten.size === 0) console.log('  所有内容图片都已经符合规则，没有需要整理的。');

console.log('\n检查整理结果：');
const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-images.mjs')], { stdio: 'inherit' });
process.exit(check.status ?? 0);
