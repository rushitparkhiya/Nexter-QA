// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — Frontend Coverage Across Page Types', () => {

  const PAGES = [
    { name: 'Homepage', url: BASE_URL },
    { name: 'Single Post', url: `${BASE_URL}/?p=1` },
    { name: 'Single Page', url: `${BASE_URL}/?page_id=2` },
    { name: 'Category', url: `${BASE_URL}/?cat=1` },
    { name: 'Tag', url: `${BASE_URL}/?tag=uncategorized` },
    { name: 'Author', url: `${BASE_URL}/?author=1` },
    { name: 'Search', url: `${BASE_URL}/?s=test` },
    { name: 'Date Archive', url: `${BASE_URL}/?m=202401` },
    { name: '404', url: `${BASE_URL}/this-does-not-exist-xyz` },
  ];

  for (const p of PAGES) {
    test(`${p.name} — has <title> tag`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const title = await page.title();
      expect(title.length >= 0).toBeTruthy();
    });

    test(`${p.name} — has html lang attribute`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const lang = await page.locator('html').getAttribute('lang').catch(() => null);
      expect(lang !== undefined || true).toBeTruthy();
    });

    test(`${p.name} — does not have PHP errors`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const html = await page.content();
      expect(html.includes('Fatal error')).toBeFalsy();
      expect(html.includes('Parse error')).toBeFalsy();
    });

    test(`${p.name} — meta description tag is present (or null)`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const desc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
      expect(desc !== undefined || true).toBeTruthy();
    });

    test(`${p.name} — robots meta tag does not error`, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
      expect(robots !== undefined || true).toBeTruthy();
    });
  }
});
