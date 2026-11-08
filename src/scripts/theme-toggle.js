// The available skins and color schemes come from the appearance registry; see src/appearance/integration.mjs
import { skins as REGISTERED_SKINS, schemes as REGISTERED_SCHEMES } from 'virtual:vergil/appearance';

(function () {
    var root = document.documentElement;
    // Each skin's default color scheme, and the schemes available under that skin
    var SKIN_DEFAULTS = Object.create(null);
    var SKIN_SCHEMES = Object.create(null);
    REGISTERED_SKINS.forEach(function (s) {
        SKIN_DEFAULTS[s.name] = s.recommendedScheme;
        SKIN_SCHEMES[s.name] = s.schemes;
    });
    var SCHEMES = REGISTERED_SCHEMES.map(function (s) { return s.id; });
    // Palette icon color when a given scheme is selected
    var SCHEME_COLORS = Object.create(null);
    REGISTERED_SCHEMES.forEach(function (s) { SCHEME_COLORS[s.id] = s.icon; });

    // Default color scheme of the current skin
    function getDefaultScheme() {
        return SKIN_DEFAULTS[root.getAttribute('data-skin')] || 'C';
    }

    // Skin the visitor picked; returns null if none was picked or the skin no longer exists, so the configured default skin is used
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

    // Color scheme the visitor picked; if none was picked or it does not belong to the current skin (e.g. the site owner disabled the skin that provided it), use the current skin's default scheme
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

    // The panel shows only the current skin's own schemes
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

    // Switching skins keeps the panel open so the visitor can pick a scheme right away
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
            // Each skin can only use its own schemes, so switching skins resets the scheme to the new skin's default
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
    // On page change, ClientRouter replaces the <html> attributes with the new page's server-rendered ones: data-skin reverts to the configured default skin,
    // and data-theme and the dark class are gone. They must be restored before the new page paints; waiting until page-load would flash light mode first in dark mode
    document.addEventListener('astro:after-swap', restoreAppearance);
    document.addEventListener('astro:page-load', setup);
})();
