/**
 * Mermaid / ECharts lazy initialization with dark-mode support.
 *
 * - Uses IntersectionObserver to defer off-screen charts until they enter viewport.
 * - Shows a shimmer skeleton while the library is being fetched and rendered.
 * - ECharts is loaded from a tree-shaken core module (~250KB instead of ~1.1MB).
 * - Watches for dark-mode toggles and re-renders charts with appropriate themes.
 * - Mermaid uses native dark theme (not CSS filter hack).
 * - Prevents double-init on ViewTransitions via per-instance flags.
 */

// ========== State ==========
let mermaidLib = null;
let echartsLib = null;
const activeECharts = new Map(); // uid -> { chart, ro, container }

// ========== Utilities ==========

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

/** Normalize mermaid arrows: remark may convert --> into em/en dashes */
function normalizeMermaid(text) {
    return text
        .replace(/\u2014/g, '--')
        .replace(/\u2013/g, '--')
        .replace(/\u2015/g, '--');
}

/** Mark a container as loaded so the skeleton animation stops */
function markLoaded(el) {
    if (el) el.dataset.loaded = 'true';
}

/** Check if a node is within the viewport (with margin) */
function isInViewport(node, margin = 150) {
    const rect = node.getBoundingClientRect();
    return rect.top < window.innerHeight + margin && rect.bottom > -margin;
}

/** Observe a node and run initFn when it approaches the viewport.
 *  If already in viewport, runs immediately. */
function whenVisible(node, initFn, options = {}) {
    const { rootMargin = '150px', threshold = 0 } = options;

    if (isInViewport(node)) {
        initFn(node);
        return;
    }

    if (!('IntersectionObserver' in window)) {
        initFn(node);
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    initFn(entry.target);
                }
            });
        },
        { rootMargin, threshold }
    );
    observer.observe(node);
}

/** Watch for theme changes on document.documentElement classList */
function watchThemeChange(callback) {
    if (!('MutationObserver' in window)) return null;
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'class') {
                callback();
                break;
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true });
    return observer;
}

// ========== Mermaid ==========

/**
 * Mermaid 12 起默认用 ELK 布局和 neo 外观，图表会整体换个样子。固定成 classic + dagre，
 * 和之前的图表保持一致（也省掉 ELK 那块代码的加载）；单个图表仍可在自己的 front matter 里改
 */
function mermaidConfig() {
    return {
        startOnLoad: false,
        theme: isDarkMode() ? 'dark' : 'default',
        securityLevel: 'strict',
        look: 'classic',
        layout: 'dagre',
    };
}

async function loadMermaid() {
    if (mermaidLib) return mermaidLib;
    try {
        const mod = await import('mermaid');
        mermaidLib = mod.default || mod;
        mermaidLib.initialize(mermaidConfig());
        return mermaidLib;
    } catch (e) {
        console.error('[Charts] Mermaid init error:', e);
        return null;
    }
}

async function renderMermaid() {
    const containers = document.querySelectorAll('[data-mermaid]');
    if (!containers.length) return;

    const mermaid = await loadMermaid();
    if (!mermaid) return;

    containers.forEach((container) => {
        whenVisible(container, async () => {
            // Prevent double-init (ViewTransitions or theme change re-render)
            if (container.dataset.mermaidInitialized) return;
            container.dataset.mermaidInitialized = 'true';

            const sourceEl = container.querySelector('.md-mermaid-source');
            const outputEl = container.querySelector('.md-mermaid-output');
            if (!sourceEl || !outputEl) return;

            const graphDefinition = normalizeMermaid(sourceEl.textContent);
            try {
                const result = await mermaid.render(
                    container.dataset.mermaidId || 'mermaid-graph',
                    graphDefinition
                );
                const svg = typeof result === 'string' ? result : result.svg;
                outputEl.innerHTML = svg || '';
                markLoaded(outputEl);
            } catch (err) {
                // \u9519\u8bef\u4fe1\u606f\u91cc\u4f1a\u5e26\u4e0a\u56fe\u8868\u6e90\u7801\u7247\u6bb5\uff0c\u5f53\u6587\u672c\u653e\u8fdb\u53bb\uff0c\u4e0d\u5f53 HTML \u89e3\u6790
                const msg = document.createElement('div');
                msg.className = 'md-echart-error-msg';
                msg.textContent = 'Mermaid \u6e32\u67d3\u5931\u8d25: ' + (err && err.message ? err.message : String(err));
                outputEl.replaceChildren(msg);
                markLoaded(outputEl);
            }
        });
    });
}

/** Clear all mermaid instance flags so they can be re-rendered */
function resetMermaid() {
    document.querySelectorAll('[data-mermaid]').forEach((container) => {
        delete container.dataset.mermaidInitialized;
        const outputEl = container.querySelector('.md-mermaid-output');
        if (outputEl) {
            outputEl.innerHTML = '';
            delete outputEl.dataset.loaded;
        }
    });
}

// ========== ECharts ==========

async function loadECharts() {
    if (echartsLib) return echartsLib;
    try {
        const mod = await import('./echarts-core.mjs');
        echartsLib = mod.default || mod;
        return echartsLib;
    } catch (e) {
        console.error('[Charts] ECharts init error:', e);
        return null;
    }
}

function initSingleEChart(container, echarts) {
    const chartEl = container.querySelector('.md-echart-container');
    if (!chartEl) return;
    if (chartEl.dataset.echartInitialized) return;

    let option;
    try {
        option = JSON.parse(chartEl.dataset.option || '{}');
    } catch (e) {
        return;
    }

    if (typeof echarts.init !== 'function') {
        console.error('[Charts] echarts.init is not a function');
        return;
    }

    chartEl.dataset.echartInitialized = 'true';
    const uid = container.dataset.echartId || '';

    const theme = isDarkMode() ? 'vergil-dark' : null;
    const chart = echarts.init(chartEl, theme);
    if (!chart) return;

    chart.setOption(option);
    markLoaded(chartEl);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(chartEl);

    const cleanup = () => {
        ro.disconnect();
        chart.dispose();
        delete chartEl.dataset.echartInitialized;
        activeECharts.delete(uid);
    };

    container.addEventListener('astro:before-swap', cleanup, { once: true });

    activeECharts.set(uid, { chart, ro, container });
}

async function renderECharts() {
    const containers = document.querySelectorAll('[data-echart]');
    if (!containers.length) return;

    const echarts = await loadECharts();
    if (!echarts) return;

    containers.forEach((container) => {
        whenVisible(container, () => initSingleEChart(container, echarts));
    });
}

/** Dispose all ECharts instances and clear flags for re-render */
function resetECharts() {
    activeECharts.forEach(({ chart, ro, container }) => {
        ro.disconnect();
        chart.dispose();
        const chartEl = container.querySelector('.md-echart-container');
        if (chartEl) {
            delete chartEl.dataset.echartInitialized;
        }
    });
    activeECharts.clear();
}

// ========== Theme change handling ==========

let _themeDebounceTimer = null;

function onThemeChange() {
    // Debounce: theme toggle may trigger multiple class mutations
    if (_themeDebounceTimer) clearTimeout(_themeDebounceTimer);
    _themeDebounceTimer = setTimeout(() => {
        // Re-configure mermaid with new theme
        if (mermaidLib) {
            mermaidLib.initialize(mermaidConfig());
        }

        resetMermaid();
        resetECharts();

        renderMermaid();
        renderECharts();
    }, 50);
}

// ========== Entry ==========

async function initCharts() {
    await Promise.all([renderMermaid(), renderECharts()]);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts);
} else {
    initCharts();
}
document.addEventListener('astro:page-load', initCharts);

watchThemeChange(onThemeChange);
