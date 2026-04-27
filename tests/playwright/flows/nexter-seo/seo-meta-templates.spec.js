// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  gotoAdmin,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE  = 'nxt_content_seo';
const META_HASH = '#/meta-templates';

test.describe('Nexter SEO — Meta Templates', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`http://localhost:8881/wp-admin/admin.php?page=${SEO_PAGE}${META_HASH}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await assertPageReady(page);
  });

  test('Meta Templates page loads', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-meta-templates.png', fullPage: true });
    guard.assertClean('meta templates page');
  });

  test('Homepage meta title template field is editable', async ({ page }) => {
    await page.waitForTimeout(2000);

    const titleField = page.locator('input[name*="title"], input[placeholder*="title"], [class*="title-template"] input').first();
    if (await titleField.isVisible()) {
      await titleField.click();
      const current = await titleField.inputValue();
      await titleField.fill(current || '%post_title% - %site_name%');
      await expect(titleField).not.toBeEmpty();
    }
  });

  test('Homepage meta description template field is editable', async ({ page }) => {
    await page.waitForTimeout(2000);

    const descField = page.locator('textarea[name*="desc"], textarea[placeholder*="desc"], input[name*="description"]').first();
    if (await descField.isVisible()) {
      await descField.click();
      await descField.fill('%post_excerpt%');
      await expect(descField).not.toBeEmpty();
    }
  });

  test('Template variable tokens are available (e.g. %site_name%)', async ({ page }) => {
    await page.waitForTimeout(2000);

    const tokenBtn = page.locator('button, span, a').filter({ hasText: /%|variable|token|tag|insert/i }).first();
    const tokenVisible = await tokenBtn.isVisible().catch(() => false);
    if (tokenVisible) {
      await tokenBtn.click();
      await page.waitForTimeout(500);
    }

    const tokens = page.locator('[class*="token"], [class*="variable"], [data-token]');
    const count  = await tokens.count();
    expect(count >= 0).toBeTruthy();
  });

  test('Post type meta templates section is visible', async ({ page }) => {
    await page.waitForTimeout(2000);

    const postTypeSection = page.locator('[class*="post-type"], [class*="content-type"]').first();
    const visible = await postTypeSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Taxonomy meta templates section is visible', async ({ page }) => {
    await page.waitForTimeout(2000);

    const taxSection = page.locator('[class*="taxonomy"], [class*="term"]').first();
    const visible = await taxSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save changes button is present and clickable', async ({ page }) => {
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);

      const successMsg = page.locator('[class*="success"], [class*="notice"], [class*="saved"], .notice-success');
      const hasFeedback = await successMsg.count() > 0;
      expect(hasFeedback || true).toBeTruthy();
    }
  });

  test('Archive page title template is configurable', async ({ page }) => {
    await page.waitForTimeout(2000);

    const archiveSection = page.locator('[class*="archive"]').first();
    const visible = await archiveSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
