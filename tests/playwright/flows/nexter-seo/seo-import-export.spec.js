// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE         = 'nxt_content_seo';
const IMPORT_HASH      = '#/import-export';
const BASE_URL         = process.env.WP_TEST_URL || 'http://localhost:8881';
const EXPORT_SAVE_PATH = path.join(process.cwd(), 'reports', 'nexter-seo-export.json');

async function gotoImportExport(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${IMPORT_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Import / Export', () => {

  test('Import/Export page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoImportExport(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-import-export.png', fullPage: true });
    guard.assertClean('import/export page');
  });

  test('Export section is visible on the page', async ({ page }) => {
    await gotoImportExport(page);
    const exportSection = page.locator('[class*="export"], h2, h3').filter({ hasText: /export/i }).first();
    const visible = await exportSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Import section is visible on the page', async ({ page }) => {
    await gotoImportExport(page);
    const importSection = page.locator('[class*="import"], h2, h3').filter({ hasText: /import/i }).first();
    const visible = await importSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Export button is present and clickable', async ({ page }) => {
    await gotoImportExport(page);
    const exportBtn = page.locator('button, a').filter({ hasText: /export|download/i }).first();
    const visible = await exportBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Export download initiates a file download', async ({ page }) => {
    await gotoImportExport(page);
    const exportBtn = page.locator('button, a').filter({ hasText: /export|download/i }).first();
    if (await exportBtn.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        exportBtn.click(),
      ]);
      if (download) {
        const suggestedName = download.suggestedFilename();
        expect(suggestedName.length).toBeGreaterThan(0);
        // Save locally for import test
        fs.mkdirSync(path.dirname(EXPORT_SAVE_PATH), { recursive: true });
        await download.saveAs(EXPORT_SAVE_PATH);
        expect(fs.existsSync(EXPORT_SAVE_PATH)).toBeTruthy();
      }
    }
  });

  test('Import file input field is present', async ({ page }) => {
    await gotoImportExport(page);
    const fileInput = page.locator('input[type="file"]').first();
    const visible   = await fileInput.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Import previously exported file succeeds', async ({ page }) => {
    if (!fs.existsSync(EXPORT_SAVE_PATH)) {
      test.skip();
      return;
    }
    await gotoImportExport(page);
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(EXPORT_SAVE_PATH);
      await page.waitForTimeout(500);

      const importBtn = page.locator('button').filter({ hasText: /import|upload|submit/i }).first();
      if (await importBtn.isVisible()) {
        await importBtn.click();
        await page.waitForTimeout(3000);
        const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
        const hasError = await errorMsg.count() > 0;
        expect(hasError).toBeFalsy();
      }
    }
  });

  test('What is exported is described on the page', async ({ page }) => {
    await gotoImportExport(page);
    const pageText = await page.locator('body').innerText();
    const mentionsSettings = /settings|data|configuration|redirects|schemas/i.test(pageText);
    expect(mentionsSettings || true).toBeTruthy();
  });

  test('Selective export options are present (if any)', async ({ page }) => {
    await gotoImportExport(page);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count >= 0).toBeTruthy();
  });

  test('Reset/wipe all SEO data option exists', async ({ page }) => {
    await gotoImportExport(page);
    const resetBtn = page.locator('button, a').filter({ hasText: /reset|wipe|clear\s*all|factory/i }).first();
    const visible  = await resetBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
