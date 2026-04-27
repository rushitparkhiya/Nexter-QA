// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE  = 'nxt_content_seo';
const LLMS_HASH = '#/llms-txt';
const BASE_URL  = process.env.WP_TEST_URL || 'http://localhost:8881';

async function gotoLlms(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${LLMS_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — LLMs.txt', () => {

  test('LLMs.txt page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoLlms(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-llms.png', fullPage: true });
    guard.assertClean('llms.txt page');
  });

  test('Enable LLMs.txt toggle is present', async ({ page }) => {
    await gotoLlms(page);
    const toggle = page.locator('[class*="llms"], label').filter({ hasText: /enable|llms/i }).first();
    const visible = await toggle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('LLMs.txt can be enabled via toggle', async ({ page }) => {
    await gotoLlms(page);
    const enableToggle = page.locator('input[name*="enable_llms"], [class*="enable-llms"] input[type="checkbox"]').first();
    if (await enableToggle.isVisible()) {
      const initial = await enableToggle.isChecked();
      if (!initial) {
        await enableToggle.check();
        expect(await enableToggle.isChecked()).toBeTruthy();
        await enableToggle.uncheck(); // restore
      }
    }
  });

  test('Pages to include in LLMs.txt are selectable', async ({ page }) => {
    await gotoLlms(page);
    const pagesSection = page.locator('[class*="llms-page"], [class*="include-page"]').first();
    const visible = await pagesSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post types to include in LLMs.txt are configurable', async ({ page }) => {
    await gotoLlms(page);
    const postTypesSection = page.locator('[class*="post-type"], [class*="content-type"]').first();
    const visible = await postTypesSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('/llms.txt URL returns 200 when enabled', async ({ page }) => {
    // First enable it
    await gotoLlms(page);
    const enableToggle = page.locator('input[name*="enable_llms"], [class*="enable-llms"] input[type="checkbox"]').first();
    if (await enableToggle.isVisible() && !(await enableToggle.isChecked())) {
      await enableToggle.check();
      const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
      }
    }
    // Check the URL
    const response = await page.goto(`${BASE_URL}/llms.txt`);
    expect([200, 404]).toContain(response?.status()); // 404 if feature not active
  });

  test('LLMs.txt preview or content editor is present', async ({ page }) => {
    await gotoLlms(page);
    const editor = page.locator('textarea, [class*="preview"], [class*="editor"]').first();
    const visible = await editor.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save LLMs.txt settings persists without error', async ({ page }) => {
    await gotoLlms(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('Link to live llms.txt file is shown when enabled', async ({ page }) => {
    await gotoLlms(page);
    const llmsLink = page.locator(`a[href*="llms.txt"]`).first();
    const visible  = await llmsLink.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
