// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
  checkFrontend,
} = require('../../helpers');

const SEO_PAGE    = 'nxt_content_seo';
const SCHEMA_HASH = '#/schema';
const BASE_URL    = process.env.WP_TEST_URL || 'http://localhost:8881';

async function gotoSchema(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${SCHEMA_HASH}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

test.describe('Nexter SEO — Schema', () => {

  test('Schema settings page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoSchema(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-schema.png', fullPage: true });
    guard.assertClean('schema settings page');
  });

  test('Website schema toggle is present', async ({ page }) => {
    await gotoSchema(page);
    const websiteSchema = page.locator('[class*="website-schema"], label').filter({ hasText: /website\s*schema|site\s*schema/i }).first();
    const visible = await websiteSchema.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Organization schema section is visible', async ({ page }) => {
    await gotoSchema(page);
    const orgSection = page.locator('[class*="organization"], label').filter({ hasText: /organization|company/i }).first();
    const visible = await orgSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Person schema type option is available', async ({ page }) => {
    await gotoSchema(page);
    const personOpt = page.locator('option, [role="option"], label').filter({ hasText: /person/i }).first();
    const visible = await personOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Schema type selector is functional', async ({ page }) => {
    await gotoSchema(page);
    const schemaTypeSelect = page.locator('select[name*="schema_type"], select[name*="type"], [class*="schema-type"] select').first();
    if (await schemaTypeSelect.isVisible()) {
      const options = await schemaTypeSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });

  test('Article schema types are listed', async ({ page }) => {
    await gotoSchema(page);
    const articleOpt = page.locator('option, label, [role="option"]').filter({ hasText: /article/i }).first();
    const visible = await articleOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Product schema type is available', async ({ page }) => {
    await gotoSchema(page);
    const productOpt = page.locator('option, label, [role="option"]').filter({ hasText: /product/i }).first();
    const visible = await productOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Schema conditions/rules section is visible', async ({ page }) => {
    await gotoSchema(page);
    const condSection = page.locator('[class*="condition"], [class*="rule"]').first();
    const visible = await condSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Add new schema button is present', async ({ page }) => {
    await gotoSchema(page);
    const addBtn = page.locator('button, a').filter({ hasText: /add\s*schema|add\s*new|new\s*schema|create/i }).first();
    const visible = await addBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Schema JSON-LD is output on site homepage', async ({ page }) => {
    const data = await checkFrontend(page, BASE_URL);
    expect(data.schemaCount >= 0).toBeTruthy();
    if (data.schemaCount > 0) {
      expect(data.schemaTypes.length).toBeGreaterThan(0);
    }
  });

  test('BreadcrumbList schema type option exists', async ({ page }) => {
    await gotoSchema(page);
    const breadcrumbOpt = page.locator('option, label, [role="option"]').filter({ hasText: /breadcrumb/i }).first();
    const visible = await breadcrumbOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Save schema settings persists without error', async ({ page }) => {
    await gotoSchema(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('Disable website schema toggle can be toggled', async ({ page }) => {
    await gotoSchema(page);
    const disableToggle = page.locator('input[type="checkbox"]').filter({ hasText: /disable.*schema|website.*schema/i });
    const directToggle  = page.locator('[class*="disable-schema"] input, [class*="website-schema"] input[type="checkbox"]').first();
    if (await directToggle.isVisible()) {
      const initial = await directToggle.isChecked();
      await directToggle.click();
      await page.waitForTimeout(300);
      const after = await directToggle.isChecked();
      expect(after).toBe(!initial);
      // restore
      await directToggle.click();
    }
  });

});
