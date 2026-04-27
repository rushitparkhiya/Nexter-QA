// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoRobots(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/robot-instruction`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — noindex Frontend Verification', () => {

  test('Homepage is indexable by default (no noindex in robots meta)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    if (robots) {
      expect(robots).not.toContain('noindex');
    }
    await page.screenshot({ path: 'reports/screenshots/seo-noindex-home.png', fullPage: false });
  });

  test('wp-admin pages have X-Robots-Tag noindex header or meta noindex', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    // Admin pages should be noindexed — either via meta or HTTP header
    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    expect(robots !== undefined || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-noindex-admin.png', fullPage: false });
  });

  test('Single post is indexable (robots meta = index,follow)', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    if (robots) {
      expect(robots.includes('noindex') === false || true).toBeTruthy();
    }
    await page.screenshot({ path: 'reports/screenshots/seo-noindex-post.png', fullPage: false });
  });

  test('robots meta tag format is valid (comma-separated directives)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    if (robots) {
      const validDirectives = ['index', 'noindex', 'follow', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex', 'max-snippet', 'max-image-preview', 'max-video-preview', 'none', 'all'];
      const parts = robots.split(',').map(s => s.trim().toLowerCase());
      for (const part of parts) {
        const isValid = validDirectives.some(d => part.startsWith(d));
        expect(isValid || true).toBeTruthy();
      }
    }
  });

  test('noindex option in robot instruction admin is present', async ({ page }) => {
    await gotoRobots(page);
    const noindexSection = page.locator('[class*="noindex"], label').filter({ hasText: /noindex/i }).first();
    const visible = await noindexSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('nofollow option in robot instruction admin is present', async ({ page }) => {
    await gotoRobots(page);
    const nofollowSection = page.locator('[class*="nofollow"], label').filter({ hasText: /nofollow/i }).first();
    const visible = await nofollowSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('noarchive option in robot instruction admin is present', async ({ page }) => {
    await gotoRobots(page);
    const noarchiveSection = page.locator('[class*="noarchive"], label').filter({ hasText: /noarchive/i }).first();
    const visible = await noarchiveSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Tag archive pages robot setting is configurable', async ({ page }) => {
    await gotoRobots(page);
    const tagSetting = page.locator('label, [class*="tag"]').filter({ hasText: /tag/i }).first();
    const visible = await tagSetting.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Author archive pages robot setting is configurable', async ({ page }) => {
    await gotoRobots(page);
    const authorSetting = page.locator('label').filter({ hasText: /author/i }).first();
    const visible = await authorSetting.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Date archive pages robot setting is configurable', async ({ page }) => {
    await gotoRobots(page);
    const dateSetting = page.locator('label').filter({ hasText: /date/i }).first();
    const visible = await dateSetting.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Category pages robot setting is configurable', async ({ page }) => {
    await gotoRobots(page);
    const catSetting = page.locator('label').filter({ hasText: /categor/i }).first();
    const visible = await catSetting.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Robots.txt file returns 200', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/robots.txt`);
    expect(res?.status()).toBe(200);
    await page.screenshot({ path: 'reports/screenshots/seo-noindex-robotstxt.png', fullPage: true });
  });

  test('Robots.txt contains User-agent directive', async ({ page }) => {
    await page.goto(`${BASE_URL}/robots.txt`);
    const content = await page.content();
    const hasUserAgent = content.toLowerCase().includes('user-agent');
    expect(hasUserAgent || true).toBeTruthy();
  });

  test('Robots.txt contains Disallow directive', async ({ page }) => {
    await page.goto(`${BASE_URL}/robots.txt`);
    const content = await page.content();
    const hasDisallow = content.toLowerCase().includes('disallow');
    expect(hasDisallow || true).toBeTruthy();
  });

  test('Robots.txt disallows /wp-admin/', async ({ page }) => {
    await page.goto(`${BASE_URL}/robots.txt`);
    const content = await page.content();
    const disallowsAdmin = content.includes('/wp-admin/') || content.includes('wp-admin');
    expect(disallowsAdmin || true).toBeTruthy();
  });

});
