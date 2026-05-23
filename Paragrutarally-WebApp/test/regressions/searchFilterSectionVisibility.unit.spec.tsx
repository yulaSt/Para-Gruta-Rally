/**
 * Regression test for a CSS leak where one page's stylesheet hid
 * `.search-filter-section` globally with `display: none !important`,
 * removing the search input from every page that uses the class.
 *
 * The rule lived in EventManagementPage.css but applied to all routes
 * because plain CSS imports are bundled, not scoped per route.
 *
 * Vitest does not pass CSS imports through to JSDOM, so this test
 * reads the stylesheets from disk and injects them as <style> tags —
 * the same way Vite's runtime does in the real app.
 */
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSS_FILES = [
    'src/styles/global.css',
    'src/pages/admin/KidsManagementPage.css',
    'src/pages/admin/EventManagementPage.css',
];

beforeAll(() => {
    for (const file of CSS_FILES) {
        const css = readFileSync(resolve(process.cwd(), file), 'utf8');
        const style = document.createElement('style');
        style.dataset.source = file;
        style.textContent = css;
        document.head.appendChild(style);
    }
});

describe('CSS regression: .search-filter-section visibility', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('a bare .search-filter-section is not hidden by any imported stylesheet', () => {
        const section = document.createElement('div');
        section.className = 'search-filter-section';
        document.body.appendChild(section);

        const display = window.getComputedStyle(section).display;
        expect(display).not.toBe('none');
    });

    test('a .search-input inside .search-filter-section remains visible', () => {
        const section = document.createElement('div');
        section.className = 'search-filter-section';

        const wrapper = document.createElement('div');
        wrapper.className = 'search-input-wrapper';
        const input = document.createElement('input');
        input.className = 'search-input';
        input.type = 'text';

        wrapper.appendChild(input);
        section.appendChild(wrapper);
        document.body.appendChild(section);

        expect(window.getComputedStyle(section).display).not.toBe('none');
        expect(window.getComputedStyle(input).display).not.toBe('none');
        expect(window.getComputedStyle(input).visibility).not.toBe('hidden');
    });

    test('the EventManagementPage .search-filter-section-row layout class is still styled', () => {
        // EventManagementPage uses `.search-filter-section-row` for its layout.
        // Guards against a future rule on `.search-filter-section` accidentally
        // matching the `-row` variant via a prefix selector.
        const row = document.createElement('div');
        row.className = 'search-filter-section-row';
        document.body.appendChild(row);

        const display = window.getComputedStyle(row).display;
        expect(display).not.toBe('none');
    });
});
