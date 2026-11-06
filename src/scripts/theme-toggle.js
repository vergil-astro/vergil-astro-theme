// 有哪些皮肤、配色来自外观注册结果，见 src/appearance/integration.mjs
import { skins as REGISTERED_SKINS, schemes as REGISTERED_SCHEMES } from 'virtual:vergil/appearance';

(function () {
    var root = document.documentElement;
    // 每个皮肤的默认配色，和这个皮肤下能选的配色
    var SKIN_DEFAULTS = Object.create(null);
    var SKIN_SCHEMES = Object.create(null);
    REGISTERED_SKINS.forEach(function (s) {
        SKIN_DEFAULTS[s.name] = s.recommendedScheme;
        SKIN_SCHEMES[s.name] = s.schemes;
    });
    var SCHEMES = REGISTERED_SCHEMES.map(function (s) { return s.id; });
    // 选中某套配色后调色盘图标的颜色
    var SCHEME_COLORS = Object.create(null);
    REGISTERED_SCHEMES.forEach(function (s) { SCHEME_COLORS[s.id] = s.icon; });

    // 当前皮肤的默认配色
    function getDefaultScheme() {
        return SKIN_DEFAULTS[root.getAttribute('data-skin')] || 'C';
    }

    // 访客选过的皮肤；没选过或者皮肤已经不存在就返回 null，用配置里的默认皮肤
    function getStoredSkin() {
        try {
            var skin = localStorage.getItem('skin');
            return skin && SKIN_SCHEMES[skin] ? skin : null;
        } catch { return null; }
    }

    function storeSkin(skin) {
        try { localStorage.setItem('skin', skin); } catch { }
    }

    function applyStoredSkin() {
        var skin = getStoredSkin();
        if (skin) root.setAttribute('data-skin', skin);
    }

    // 访客选过的配色；没选过或者不属于当前皮肤（比如站长停用了带它的皮肤）就用当前皮肤的默认配色
    function getStoredScheme() {
        var allowed = SKIN_SCHEMES[root.getAttribute('data-skin')] || [];
        try {
            var scheme = localStorage.getItem('colorScheme');
            return scheme && allowed.indexOf(scheme) !== -1 ? scheme : getDefaultScheme();
        } catch { return getDefaultScheme(); }
    }

    function storeScheme(scheme) {
        try { localStorage.setItem('colorScheme', scheme); } catch { }
    }

    function getStoredDark() {
        try {
            var v = localStorage.getItem('darkMode');
            if (v !== null) return v === 'true';
        } catch { }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function storeDark(isDark) {
        try { localStorage.setItem('darkMode', String(isDark)); } catch { }
    }

    function applyTheme(scheme, isDark) {
        root.setAttribute('data-theme', scheme);
        root.classList.toggle('dark', isDark);
    }

    function updateSchemeDots(scheme) {
        SCHEMES.forEach(function (s) {
            var dot = document.getElementById('scheme-dot-' + s);
            if (!dot) return;
            var active = s === scheme;
            dot.setAttribute('aria-pressed', active ? 'true' : 'false');
            var ring = dot.querySelector('span') || dot;
            if (active) {
                ring.classList.add('ring-accent');
                ring.classList.remove('ring-transparent');
            } else {
                ring.classList.add('ring-transparent');
                ring.classList.remove('ring-accent');
            }
        });
        var icon = document.getElementById('scheme-indicator-icon');
        if (icon && SCHEME_COLORS[scheme]) {
            icon.style.color = SCHEME_COLORS[scheme];
        }
    }

    // 面板上只显示当前皮肤自己的配色
    function updateSkinOptions(skin) {
        document.querySelectorAll('[data-skin-option]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', btn.getAttribute('data-skin-option') === skin ? 'true' : 'false');
        });
        document.querySelectorAll('[data-scheme-group]').forEach(function (group) {
            group.hidden = group.getAttribute('data-scheme-group') !== skin;
        });
    }

    function updateDarkModeIcon(isDark) {
        var lightIcon = document.getElementById('dark-mode-icon-light');
        var darkIcon = document.getElementById('dark-mode-icon-dark');
        if (lightIcon) lightIcon.classList.toggle('hidden', isDark);
        if (darkIcon) darkIcon.classList.toggle('hidden', !isDark);
    }

    var _schemeTriggerHandler = null;
    var _schemeDocHandler = null;
    var _schemePickerHandler = null;
    var _skinPickerHandler = null;
    var _darkModeHandler = null;

    function setupSchemePicker() {
        var dropdown = document.getElementById('scheme-dropdown');
        var trigger = document.getElementById('scheme-trigger');
        var picker = document.getElementById('theme-scheme-picker');

        if (trigger && dropdown) {
            if (_schemeTriggerHandler) {
                trigger.removeEventListener('click', _schemeTriggerHandler);
            }
            _schemeTriggerHandler = function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            };
            trigger.addEventListener('click', _schemeTriggerHandler);

            if (_schemeDocHandler) {
                document.removeEventListener('click', _schemeDocHandler);
            }
            _schemeDocHandler = function (e) {
                if (!dropdown.contains(e.target) && e.target !== trigger) {
                    dropdown.classList.add('hidden');
                }
            };
            document.addEventListener('click', _schemeDocHandler);
        }

        if (picker) {
            if (_schemePickerHandler) {
                picker.removeEventListener('click', _schemePickerHandler);
            }
            _schemePickerHandler = function (e) {
                var sw = e.target.closest('[data-scheme]');
                if (!sw) return;
                var clicked = sw.dataset.scheme;
                var curDark = root.classList.contains('dark');
                storeScheme(clicked);
                applyTheme(clicked, curDark);
                updateSchemeDots(clicked);
                if (dropdown) dropdown.classList.add('hidden');
            };
            picker.addEventListener('click', _schemePickerHandler);
        }
    }

    // 切皮肤不关面板，访客接着就能挑配色
    function setupSkinPicker() {
        var picker = document.getElementById('theme-skin-picker');
        if (!picker) return;
        if (_skinPickerHandler) {
            picker.removeEventListener('click', _skinPickerHandler);
        }
        _skinPickerHandler = function (e) {
            var opt = e.target.closest('[data-skin-option]');
            if (!opt) return;
            var clicked = opt.getAttribute('data-skin-option');
            storeSkin(clicked);
            root.setAttribute('data-skin', clicked);
            updateSkinOptions(clicked);
            // 每个皮肤只能选自己的配色，切皮肤时配色换成新皮肤的默认配色
            var scheme = getDefaultScheme();
            storeScheme(scheme);
            applyTheme(scheme, root.classList.contains('dark'));
            updateSchemeDots(scheme);
        };
        picker.addEventListener('click', _skinPickerHandler);
    }

    function setupDarkModeToggle() {
        var btn = document.getElementById('dark-mode-toggle');
        if (!btn) return;
        if (_darkModeHandler) {
            btn.removeEventListener('click', _darkModeHandler);
        }
        _darkModeHandler = function () {
            var curScheme = root.getAttribute('data-theme') || getDefaultScheme();
            var curDark = root.classList.contains('dark');
            var newDark = !curDark;
            storeDark(newDark);
            applyTheme(curScheme, newDark);
            updateDarkModeIcon(newDark);
        };
        btn.addEventListener('click', _darkModeHandler);
    }

    function setup() {
        applyStoredSkin();
        var scheme = getStoredScheme();
        var isDark = getStoredDark();
        applyTheme(scheme, isDark);
        updateSkinOptions(root.getAttribute('data-skin'));
        updateSchemeDots(scheme);
        updateDarkModeIcon(isDark);
        setupSkinPicker();
        setupSchemePicker();
        setupDarkModeToggle();
    }

    function restoreAppearance() {
        applyStoredSkin();
        applyTheme(getStoredScheme(), getStoredDark());
    }

    restoreAppearance();
    // 换页时 ClientRouter 会把 <html> 的属性换成新页面服务端渲染的那份：data-skin 回到配置里的默认皮肤，
    // data-theme 和 dark 类都没了。要在新页面画出来之前补回去，等到 page-load 再补，暗色模式下会先闪一下亮色
    document.addEventListener('astro:after-swap', restoreAppearance);
    document.addEventListener('astro:page-load', setup);
})();
