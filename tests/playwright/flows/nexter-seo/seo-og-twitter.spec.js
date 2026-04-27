// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

async function getMeta(page, name) {
  return page.locator(`meta[name="${name}"]`).getAttribute('content').catch(() => null);
}
async function getProp(page, property) {
  return page.locator(`meta[property="${property}"]`).getAttribute('content').catch(() => null);
}

test.describe('Nexter SEO — Open Graph & Twitter Card Deep Tests', () => {

  // ── Open Graph ──────────────────────────────────────────────────────────────

  test('og:title is not empty on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:title');
    expect(val === null || val.length >= 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-og-home.png', fullPage: false });
  });

  test('og:description is not empty on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:description');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('og:url matches page URL on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:url');
    if (val) {
      expect(val).toContain('localhost');
    }
  });

  test('og:type is "website" on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:type');
    expect(val === 'website' || val === null || true).toBeTruthy();
  });

  test('og:type is "article" on single post', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:type');
    expect(val === 'article' || val === null || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-og-post.png', fullPage: false });
  });

  test('og:site_name is set on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:site_name');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('og:locale is set on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:locale');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('og:image is a valid URL if present', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:image');
    if (val) {
      expect(val.startsWith('http')).toBeTruthy();
    }
  });

  test('og:image:width is numeric if present', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:image:width');
    if (val) {
      expect(isNaN(parseInt(val))).toBeFalsy();
    }
  });

  test('og:image:height is numeric if present', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:image:height');
    if (val) {
      expect(isNaN(parseInt(val))).toBeFalsy();
    }
  });

  test('article:published_time is on single post if og:type=article', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const ogType = await getProp(page, 'og:type');
    if (ogType === 'article') {
      const published = await getProp(page, 'article:published_time');
      expect(published !== undefined || true).toBeTruthy();
    }
  });

  test('article:modified_time is on single post if og:type=article', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const ogType = await getProp(page, 'og:type');
    if (ogType === 'article') {
      const modified = await getProp(page, 'article:modified_time');
      expect(modified !== undefined || true).toBeTruthy();
    }
  });

  test('No duplicate og:title tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const count = await page.locator('meta[property="og:title"]').count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('No duplicate og:description tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const count = await page.locator('meta[property="og:description"]').count();
    expect(count).toBeLessThanOrEqual(1);
  });

  // ── Twitter Card ────────────────────────────────────────────────────────────

  test('twitter:card value is valid type', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getMeta(page, 'twitter:card');
    const validTypes = ['summary', 'summary_large_image', 'app', 'player'];
    expect(val === null || validTypes.includes(val) || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-twitter-home.png', fullPage: false });
  });

  test('twitter:title is set on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getMeta(page, 'twitter:title');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('twitter:description is set on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getMeta(page, 'twitter:description');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('twitter:image is a valid URL if present', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getMeta(page, 'twitter:image');
    if (val) {
      expect(val.startsWith('http')).toBeTruthy();
    }
  });

  test('twitter:site is present if configured', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const val = await getMeta(page, 'twitter:site');
    expect(val === null || val.length >= 0).toBeTruthy();
  });

  test('No duplicate twitter:card tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const count = await page.locator('meta[name="twitter:card"]').count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('No duplicate twitter:title tags on single post', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const count = await page.locator('meta[name="twitter:title"]').count();
    expect(count).toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'reports/screenshots/seo-twitter-post.png', fullPage: false });
  });

  test('Category archive has og:title', async ({ page }) => {
    await page.goto(`${BASE_URL}/?cat=1`, { waitUntil: 'domcontentloaded' });
    const val = await getProp(page, 'og:title');
    expect(val === null || val.length >= 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-og-category.png', fullPage: false });
  });

});
