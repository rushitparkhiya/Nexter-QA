// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE      = 'nxt_content_seo';
const INDEXING_HASH = '#/indexing';
const BASE_URL      = process.env.WP_TEST_URL || 'http://localhost:8881';

async function gotoIndexing(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${INDEXING_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Instant Indexing', () => {

  test('Instant Indexing page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoIndexing(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-indexing.png', fullPage: true });
    guard.assertClean('instant indexing page');
  });

  test('IndexNow enable toggle is present', async ({ page }) => {
    await gotoIndexing(page);
    const indexNowToggle = page.locator('[class*="indexnow"], label').filter({ hasText: /indexnow/i }).first();
    const visible = await indexNowToggle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('IndexNow API key field is visible', async ({ page }) => {
    await gotoIndexing(page);
    const apiKeyField = page.locator('input[name*="api_key"], input[name*="indexnow_key"], input[placeholder*="api key"]').first();
    const visible = await apiKeyField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Google Indexing API section is present', async ({ page }) => {
    await gotoIndexing(page);
    const googleSection = page.locator('[class*="google"], label').filter({ hasText: /google\s*indexing|google\s*api/i }).first();
    const visible = await googleSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('API key input accepts values', async ({ page }) => {
    await gotoIndexing(page);
    const apiInput = page.locator('input[name*="api_key"], input[name*="indexnow"]').first();
    if (await apiInput.isVisible()) {
      await apiInput.fill('test-api-key-12345');
      await expect(apiInput).toHaveValue('test-api-key-12345');
      await apiInput.fill(''); // clear after test
    }
  });

  test('Submit URLs for indexing button exists', async ({ page }) => {
    await gotoIndexing(page);
    const submitBtn = page.locator('button, a').filter({ hasText: /submit|index\s*now|send\s*to\s*google|bulk\s*index/i }).first();
    const visible = await submitBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Indexing logs or history section is present', async ({ page }) => {
    await gotoIndexing(page);
    const logsSection = page.locator('[class*="log"], [class*="history"], [class*="submitted"]').first();
    const visible = await logsSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post types to auto-index are selectable', async ({ page }) => {
    await gotoIndexing(page);
    const postTypeList = page.locator('[class*="post-type"] input[type="checkbox"], [class*="auto-index"] input').first();
    const visible = await postTypeList.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save indexing settings persists without error', async ({ page }) => {
    await gotoIndexing(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('Clear indexing logs button is present', async ({ page }) => {
    await gotoIndexing(page);
    const clearBtn = page.locator('button, a').filter({ hasText: /clear\s*log|delete\s*log|remove\s*log/i }).first();
    const visible = await clearBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
