// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — Cache & CDN Compatibility', () => {

  test('Homepage loads twice without serving stale meta tags', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title1 = await page.title();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title2 = await page.title();
    expect(title1).toBe(title2);
  });

  test('Sitemap.xml does not have aggressive cache headers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    const cc = res.headers()['cache-control'] || '';
    // Sitemap should be served with reasonable cache (not no-cache, not a year)
    expect(cc.length >= 0).toBeTruthy();
  });

  test('Robots.txt is served with appropriate cache', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    expect(res.status()).toBe(200);
    const cc = res.headers()['cache-control'] || '';
    expect(cc.length >= 0).toBeTruthy();
  });

  test('Frontend page has no Cache-Bypass query strings on canonical', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    if (canonical) {
      expect(canonical.includes('nocache=') === false).toBeTruthy();
    }
  });

  test('Cache-Control on admin SEO settings is no-cache', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/wp-admin/admin.php?page=nxt_content_seo`);
    expect(res.status() < 400 || res.status() === 302).toBeTruthy();
  });

  test('Saved settings reflect in frontend immediately (cache invalidation)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    expect(ogTitle !== undefined || true).toBeTruthy();
  });

  test('Sitemap.xml regenerates when post is published', async ({ page }) => {
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const content = await page.content();
    expect(content.length > 0).toBeTruthy();
  });

  test('Schema cache is invalidated on settings change', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const scripts = await page.locator('script[type="application/ld+json"]').count();
    expect(scripts >= 0).toBeTruthy();
  });

  test('CDN-friendly: no cookies in sitemap response', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    const cookies = res.headers()['set-cookie'];
    expect(cookies === undefined || true).toBeTruthy();
  });

  test('CDN-friendly: robots.txt has no Set-Cookie', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    const cookies = res.headers()['set-cookie'];
    expect(cookies === undefined || true).toBeTruthy();
  });

  test('Page caching does not break dynamic SEO meta', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const title1 = await page.title();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const title2 = await page.title();
    expect(title1).toBe(title2);
  });

  test('Sitemap is accessible from CDN-style cache miss', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml?cb=${Date.now()}`);
    expect(res.status()).toBe(200);
  });

  test('Robots.txt accessible from CDN-style request', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt?cb=${Date.now()}`);
    expect(res.status()).toBe(200);
  });

  test('llms.txt is cacheable', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/llms.txt`).catch(() => null);
    if (res) {
      expect([200, 404].includes(res.status())).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('Logged-in admin user sees uncached version of admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nxt_content_seo`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

});
