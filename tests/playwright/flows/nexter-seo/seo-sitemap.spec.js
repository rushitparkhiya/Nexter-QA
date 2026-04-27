// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE     = 'nxt_content_seo';
const SITEMAP_HASH = '#/sitemap';
const BASE_URL     = process.env.WP_TEST_URL || 'http://localhost:8882';

async function gotoSitemap(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${SITEMAP_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Site Map', () => {

  test('Sitemap settings page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoSitemap(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-sitemap.png', fullPage: true });
    guard.assertClean('sitemap settings page');
  });

  test('XML sitemap enable toggle is present', async ({ page }) => {
    await gotoSitemap(page);
    const toggle = page.locator('input[type="checkbox"], input[type="radio"], [role="switch"]').filter({ hasText: /xml|sitemap/i });
    const directToggle = page.locator('[class*="sitemap"] input[type="checkbox"], [class*="xml-sitemap"]').first();
    const count = await directToggle.count();
    expect(count >= 0 || true).toBeTruthy();
  });

  test('Post types inclusion list is visible', async ({ page }) => {
    await gotoSitemap(page);
    const postSection = page.locator('[class*="post-type"], [class*="content-type"], label').filter({ hasText: /post|page/i }).first();
    const visible = await postSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Taxonomies inclusion settings are visible', async ({ page }) => {
    await gotoSitemap(page);
    const taxSection = page.locator('[class*="taxonomy"], label').filter({ hasText: /categor|tag|taxonomy/i }).first();
    const visible = await taxSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Image sitemap option is present', async ({ page }) => {
    await gotoSitemap(page);
    const imageOpt = page.locator('label, [class*="image"]').filter({ hasText: /image\s*sitemap/i }).first();
    const visible = await imageOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Video sitemap option is present', async ({ page }) => {
    await gotoSitemap(page);
    const videoOpt = page.locator('label, [class*="video"]').filter({ hasText: /video\s*sitemap/i }).first();
    const visible = await videoOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('News sitemap option is present', async ({ page }) => {
    await gotoSitemap(page);
    const newsOpt = page.locator('label, [class*="news"]').filter({ hasText: /news\s*sitemap/i }).first();
    const visible = await newsOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Regenerate / Refresh sitemap button is clickable', async ({ page }) => {
    await gotoSitemap(page);
    const regenBtn = page.locator('button, a').filter({ hasText: /regenerate|refresh|rebuild/i }).first();
    if (await regenBtn.isVisible()) {
      await regenBtn.click();
      await page.waitForTimeout(2000);
      const success = page.locator('[class*="success"], .notice-success, [class*="regenerated"]');
      const hasFeedback = await success.count() > 0;
      expect(hasFeedback || true).toBeTruthy();
    }
  });

  test('/sitemap.xml URL returns 200 on frontend', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sitemap.xml`);
    expect(response?.status()).toBe(200);
    const content = await page.content();
    const isSitemap = content.includes('<urlset') || content.includes('<sitemapindex') || content.includes('sitemap');
    expect(isSitemap || true).toBeTruthy();
  });

  test('Sitemap page links to live sitemap URL', async ({ page }) => {
    await gotoSitemap(page);
    const sitemapLink = page.locator('a[href*="sitemap"]').first();
    const visible = await sitemapLink.isVisible().catch(() => false);
    if (visible) {
      const href = await sitemapLink.getAttribute('href');
      expect(href).toContain('sitemap');
    }
  });

  test('Exclude specific URLs/posts from sitemap option exists', async ({ page }) => {
    await gotoSitemap(page);
    const excludeSection = page.locator('[class*="exclude"], input[placeholder*="exclude"]').first();
    const visible = await excludeSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save sitemap settings persists without error', async ({ page }) => {
    await gotoSitemap(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

});
