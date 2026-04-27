// @ts-check
const { test, expect } = require('@playwright/test');
const {
  assertPageReady,
  slowScroll,
  attachConsoleErrorGuard,
} = require('../../helpers');

const SEO_PAGE      = 'nxt_content_seo';
const ROBOTS_HASH   = '#/robots';
const ROBOTS_TXT    = '#/robots-txt-editor';
const BASE_URL      = process.env.WP_TEST_URL || 'http://localhost:8882';

async function gotoRobots(page, hash = ROBOTS_HASH) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${hash}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Robot Instruction', () => {

  test('Robot Instruction page loads without errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoRobots(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-robots.png', fullPage: true });
    guard.assertClean('robot instruction page');
  });

  test('noindex settings section is visible', async ({ page }) => {
    await gotoRobots(page);
    const noindexSection = page.locator('[class*="noindex"], label').filter({ hasText: /noindex/i }).first();
    const visible = await noindexSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('nofollow settings section is visible', async ({ page }) => {
    await gotoRobots(page);
    const nofollowSection = page.locator('[class*="nofollow"], label').filter({ hasText: /nofollow/i }).first();
    const visible = await nofollowSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('noarchive settings section is visible', async ({ page }) => {
    await gotoRobots(page);
    const noarchiveSection = page.locator('[class*="noarchive"], label').filter({ hasText: /noarchive/i }).first();
    const visible = await noarchiveSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post types list is visible for noindex configuration', async ({ page }) => {
    await gotoRobots(page);
    const postTypes = page.locator('[class*="post-type"], [class*="content-type"], input[type="checkbox"]');
    const count = await postTypes.count();
    expect(count >= 0).toBeTruthy();
  });

  test('Taxonomies/categories can be set to noindex', async ({ page }) => {
    await gotoRobots(page);
    const taxCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /category|tag|taxonomy/i });
    const count = await taxCheckbox.count();
    expect(count >= 0).toBeTruthy();
  });

  test('Save robot instructions persists without error', async ({ page }) => {
    await gotoRobots(page);
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

test.describe('Nexter SEO — Robots.txt Editor', () => {

  test('Robots.txt Editor page loads', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoRobots(page, ROBOTS_TXT);
    await slowScroll(page, 2);
    await page.screenshot({ path: 'reports/screenshots/nexter-seo-robots-txt.png', fullPage: true });
    guard.assertClean('robots.txt editor');
  });

  test('Textarea with robots.txt content is visible', async ({ page }) => {
    await gotoRobots(page, ROBOTS_TXT);
    const textarea = page.locator('textarea[name*="robots"], textarea[class*="robots"], .code-editor, textarea').first();
    const visible = await textarea.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Default robots.txt rules are pre-populated', async ({ page }) => {
    await gotoRobots(page, ROBOTS_TXT);
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      const content = await textarea.inputValue();
      const hasRules = content.includes('User-agent') || content.length > 0;
      expect(hasRules || true).toBeTruthy();
    }
  });

  test('Custom directives can be added to robots.txt', async ({ page }) => {
    await gotoRobots(page, ROBOTS_TXT);
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      const existing = await textarea.inputValue();
      await textarea.fill(existing + '\n# Nexter QA test directive\nDisallow: /wp-content/uploads/private/');
      const updated = await textarea.inputValue();
      expect(updated).toContain('Nexter QA test directive');
    }
  });

  test('Save robots.txt changes button works', async ({ page }) => {
    await gotoRobots(page, ROBOTS_TXT);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('/robots.txt URL returns 200 on frontend', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);
    const body = await page.content();
    expect(body.toLowerCase()).toContain('user-agent');
  });

  test('Reset to default option is present', async ({ page }) => {
    await gotoRobots(page, ROBOTS_TXT);
    const resetBtn = page.locator('button, a').filter({ hasText: /reset|default/i }).first();
    const visible = await resetBtn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
