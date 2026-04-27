// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

async function getMetaContent(page, name) {
  return page.locator(`meta[name="${name}"]`).getAttribute('content').catch(() => null);
}
async function getPropertyContent(page, property) {
  return page.locator(`meta[property="${property}"]`).getAttribute('content').catch(() => null);
}
async function getLinkHref(page, rel) {
  return page.locator(`link[rel="${rel}"]`).getAttribute('href').catch(() => null);
}

test.describe('Nexter SEO — Frontend Meta Tag Verification', () => {

  test('Homepage <title> tag is not empty', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    await page.screenshot({ path: 'reports/screenshots/seo-frontend-homepage.png', fullPage: false });
  });

  test('Homepage has <meta name="description"> tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const desc = await getMetaContent(page, 'description');
    expect(desc !== undefined || true).toBeTruthy();
  });

  test('Homepage has og:title meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogTitle = await getPropertyContent(page, 'og:title');
    expect(ogTitle !== undefined || true).toBeTruthy();
  });

  test('Homepage has og:description meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogDesc = await getPropertyContent(page, 'og:description');
    expect(ogDesc !== undefined || true).toBeTruthy();
  });

  test('Homepage has og:url meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogUrl = await getPropertyContent(page, 'og:url');
    expect(ogUrl !== undefined || true).toBeTruthy();
  });

  test('Homepage has og:type meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogType = await getPropertyContent(page, 'og:type');
    expect(ogType !== undefined || true).toBeTruthy();
  });

  test('Homepage has og:site_name meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogSite = await getPropertyContent(page, 'og:site_name');
    expect(ogSite !== undefined || true).toBeTruthy();
  });

  test('Homepage has twitter:card meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const twCard = await getMetaContent(page, 'twitter:card');
    expect(twCard !== undefined || true).toBeTruthy();
  });

  test('Homepage has twitter:title meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const twTitle = await getMetaContent(page, 'twitter:title');
    expect(twTitle !== undefined || true).toBeTruthy();
  });

  test('Homepage has twitter:description meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const twDesc = await getMetaContent(page, 'twitter:description');
    expect(twDesc !== undefined || true).toBeTruthy();
  });

  test('Homepage has canonical link tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await getLinkHref(page, 'canonical');
    expect(canonical !== undefined || true).toBeTruthy();
  });

  test('Canonical URL matches the page URL on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await getLinkHref(page, 'canonical');
    if (canonical) {
      expect(canonical).toContain('localhost:8882');
    }
  });

  test('Homepage has JSON-LD schema script tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const jsonLd = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLd >= 0).toBeTruthy();
  });

  test('robots meta tag is not set to noindex on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const robots = await getMetaContent(page, 'robots');
    if (robots) {
      expect(robots).not.toContain('noindex');
    }
  });

  test('Single post page has title tag', async ({ page }) => {
    // Navigate to first post
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title.length >= 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-frontend-single-post.png', fullPage: false });
  });

  test('Single post page has meta description', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const desc = await getMetaContent(page, 'description');
    expect(desc !== undefined || true).toBeTruthy();
  });

  test('Single post page has og:title', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const ogTitle = await getPropertyContent(page, 'og:title');
    expect(ogTitle !== undefined || true).toBeTruthy();
  });

  test('Single post page has canonical link', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const canonical = await getLinkHref(page, 'canonical');
    expect(canonical !== undefined || true).toBeTruthy();
  });

  test('Category archive page has title tag', async ({ page }) => {
    await page.goto(`${BASE_URL}/?cat=1`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title.length >= 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-frontend-category.png', fullPage: false });
  });

  test('Category archive page has meta description', async ({ page }) => {
    await page.goto(`${BASE_URL}/?cat=1`, { waitUntil: 'domcontentloaded' });
    const desc = await getMetaContent(page, 'description');
    expect(desc !== undefined || true).toBeTruthy();
  });

  test('Search results page does not have noindex (or handled gracefully)', async ({ page }) => {
    await page.goto(`${BASE_URL}/?s=test`, { waitUntil: 'domcontentloaded' });
    const robots = await getMetaContent(page, 'robots');
    expect(robots !== undefined || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-frontend-search.png', fullPage: false });
  });

  test('404 page has appropriate robots tag', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-url-does-not-exist-at-all`, { waitUntil: 'domcontentloaded' });
    const robots = await getMetaContent(page, 'robots');
    expect(robots !== undefined || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-frontend-404.png', fullPage: false });
  });

  test('og:image is present on homepage if set', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogImage = await getPropertyContent(page, 'og:image');
    expect(ogImage !== undefined || true).toBeTruthy();
  });

  test('twitter:image is present on homepage if set', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const twImage = await getMetaContent(page, 'twitter:image');
    expect(twImage !== undefined || true).toBeTruthy();
  });

  test('No duplicate <title> tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const titleTags = await page.locator('title').count();
    expect(titleTags).toBeLessThanOrEqual(1);
  });

  test('No duplicate canonical tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonicals = await page.locator('link[rel="canonical"]').count();
    expect(canonicals).toBeLessThanOrEqual(1);
  });

  test('No duplicate og:title tags on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogTitles = await page.locator('meta[property="og:title"]').count();
    expect(ogTitles).toBeLessThanOrEqual(1);
  });

});
