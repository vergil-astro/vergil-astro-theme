/**
 * Table of contents scroll highlighting.
 *
 * SidebarToc and FloatingToc each used to carry an identical copy of the algorithm: collect all headings with an id,
 * use the sticky nav height as the threshold line, find the last heading past that line, and move the highlight.
 * Only the selectors and highlight class names differed, so the algorithm lives here and the differences are passed in as callbacks.
 */

/** Combined height of the sticky nav and toolbar, used as the "heading scrolled past" threshold line */
export function getScrollOffset() {
    const header = document.getElementById('top-nav-header');
    const toolbar = document.getElementById('floating-toolbar');
    return (header ? header.offsetHeight : 56) + (toolbar ? toolbar.offsetHeight : 0) + 16;
}

/**
 * @param {object} options
 * @param {() => NodeListOf<Element>|Element[]} options.getHeadings Get the heading collection
 * @param {(id: string) => Element|null} options.resolveLink       Find the TOC item for a heading id
 * @param {(link: Element) => void} options.activate               Highlight a TOC item
 * @param {() => void} options.deactivateAll                       Clear all highlights
 * @param {() => boolean} [options.shouldSkip]                     Return true to skip this frame
 * @param {string} options.handlerKey                              Name of the handler stored on window, used to unbind it on page change
 * @returns {() => void} Runs once immediately and returns the update function
 */
export function createScrollSpy({ getHeadings, resolveLink, activate, deactivateAll, shouldSkip, handlerKey }) {
    let lastActiveId = null;

    function update() {
        if (shouldSkip && shouldSkip()) return;

        const offset = getScrollOffset();
        let activeHeading = null;
        getHeadings().forEach((heading) => {
            if (heading.getBoundingClientRect().top <= offset) {
                activeHeading = heading;
            }
        });
        if (!activeHeading) return;

        const id = activeHeading.getAttribute('id');
        if (!id || id === lastActiveId) return;
        lastActiveId = id;

        const link = resolveLink(id);
        if (!link) return;

        deactivateAll();
        activate(link);
        link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            update();
            ticking = false;
        });
    }

    // Components reinitialize after a ViewTransitions page change, so remove the previous listener first
    if (handlerKey && window[handlerKey]) {
        window.removeEventListener('scroll', window[handlerKey]);
    }
    if (handlerKey) window[handlerKey] = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });

    update();
    return update;
}
