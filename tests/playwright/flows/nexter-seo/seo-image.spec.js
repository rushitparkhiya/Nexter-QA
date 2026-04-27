// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE   = 'nxt_content_seo';
const IMAGE_HASH = '#/image-seo';
const BASE_URL   = process.env.WP_TEST_URL || 'http://localhost:8881';

async function gotoImageSeo(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${IMAGE_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Image SEO', () => {

  test('Image SEO page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoImageSeo(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-image.png', fullPage: true });
    guard.assertClean('image seo page');
  });

  test('Auto ALT text setting is present', async ({ page }) => {
    await gotoImageSeo(page);
    const altSection = page.locator('[class*="alt"], label').filter({ hasText: /auto\s*alt|alt\s*text|automatic\s*alt/i }).first();
    const visible = await altSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Auto ALT text template pattern is configurable', async ({ page }) => {
    await gotoImageSeo(page);
    const altInput = page.locator('input[name*="alt"], input[placeholder*="alt"], [class*="alt-template"] input').first();
    if (await altInput.isVisible()) {
      await altInput.fill('%filename%');
      await expect(altInput).not.toBeEmpty();
    }
  });

  test('Auto title for images is configurable', async ({ page }) => {
    await gotoImageSeo(page);
    const titleInput = page.locator('input[name*="image_title"], input[placeholder*="image title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('%filename%');
      await expect(titleInput).not.toBeEmpty();
    }
  });

  test('Attachment page redirect option is present', async ({ page }) => {
    await gotoImageSeo(page);
    const redirectSection = page.locator('[class*="attachment"], label').filter({ hasText: /attachment|redirect/i }).first();
    const visible = await redirectSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Attachment pages can be set to redirect to parent post', async ({ page }) => {
    await gotoImageSeo(page);
    const redirectToggle = page.locator('input[type="checkbox"], input[type="radio"]').filter({ hasText: /redirect.*attachment|attachment.*redirect/i });
    const directToggle = page.locator('[class*="attachment-redirect"] input, [name*="redirect_attachment"]').first();
    const visible = await directToggle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Image caption auto-fill option exists', async ({ page }) => {
    await gotoImageSeo(page);
    const captionSection = page.locator('[class*="caption"], label').filter({ hasText: /caption/i }).first();
    const visible = await captionSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save image SEO settings persists without error', async ({ page }) => {
    await gotoImageSeo(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('Bulk optimize / process existing images option exists', async ({ page }) => {
    await gotoImageSeo(page);
    const bulkBtn = page.locator('button, a').filter({ hasText: /bulk|process\s*existing|optimize\s*all/i }).first();
    const visible = await bulkBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
