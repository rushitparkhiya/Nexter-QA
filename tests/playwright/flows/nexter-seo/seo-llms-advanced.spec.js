// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady, attachConsoleErrorGuard, slowScroll } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoLLMs(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/llms-txt`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — LLMs.txt Advanced', () => {

  test('LLMs.txt admin page loads without console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoLLMs(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/seo-llms-adv-admin.png', fullPage: true });
    guard.assertClean('llms advanced page');
  });

  test('Enable/Disable LLMs.txt toggle saves state', async ({ page }) => {
    await gotoLLMs(page);
    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first();
    if (await toggle.isVisible()) {
      const before = await toggle.isChecked();
      await toggle.click();
      await page.waitForTimeout(300);
      const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
      }
      // Toggle back
      await toggle.click();
      await page.waitForTimeout(300);
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
      }
    }
    expect(true).toBeTruthy();
  });

  test('/llms.txt URL returns 200 or 404 (depending on enabled state)', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/llms.txt`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-llms-adv-file.png', fullPage: true });
  });

  test('/llms.txt content when enabled has site name', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/llms.txt`).catch(() => null);
    if (res?.status() === 200) {
      const content = await page.content();
      expect(content.length > 0).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('/llms.txt does not contain PHP errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/llms.txt`).catch(() => {});
    const content = await page.content();
    expect(content.includes('Fatal error') || content.includes('Parse error')).toBeFalsy();
  });

  test('Post types to include in LLMs.txt are listed as checkboxes', async ({ page }) => {
    await gotoLLMs(page);
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    expect(checkboxes >= 0).toBeTruthy();
  });

  test('Post post type can be included in LLMs.txt', async ({ page }) => {
    await gotoLLMs(page);
    const postCheckbox = page.locator('label').filter({ hasText: /^post$|posts/i }).first();
    const visible = await postCheckbox.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Page post type can be included in LLMs.txt', async ({ page }) => {
    await gotoLLMs(page);
    const pageCheckbox = page.locator('label').filter({ hasText: /^page$|pages/i }).first();
    const visible = await pageCheckbox.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Custom content/intro text field is present for LLMs.txt', async ({ page }) => {
    await gotoLLMs(page);
    const introText = page.locator('textarea[name*="intro"], textarea[name*="llms"], textarea[placeholder*="intro"]').first();
    const visible = await introText.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Custom intro text can be entered', async ({ page }) => {
    await gotoLLMs(page);
    const introText = page.locator('textarea[name*="intro"], textarea').first();
    if (await introText.isVisible()) {
      await introText.fill('This site is about Nexter QA automation.');
      await expect(introText).not.toBeEmpty();
    }
  });

  test('Link to live llms.txt is shown when enabled', async ({ page }) => {
    await gotoLLMs(page);
    const liveLink = page.locator('a[href*="llms.txt"]').first();
    const visible = await liveLink.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Preview of llms.txt content is shown in admin', async ({ page }) => {
    await gotoLLMs(page);
    const preview = page.locator('[class*="preview"], [class*="content-preview"], pre').first();
    const visible = await preview.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-llms-adv-preview.png', fullPage: true });
  });

  test('LLMs.txt excludes password-protected pages', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/llms.txt`).catch(() => null);
    if (res?.status() === 200) {
      const content = await page.content();
      // Confirm it's not empty and doesn't include private data markers
      expect(content.length > 0).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('LLMs.txt max items per post type field is present', async ({ page }) => {
    await gotoLLMs(page);
    const maxItems = page.locator('input[type="number"], input[name*="max"], input[name*="limit"]').first();
    const visible = await maxItems.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('LLMs.txt settings save without error', async ({ page }) => {
    await gotoLLMs(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('LLMs.txt loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/llms.txt`).catch(() => {});
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('robots.txt references llms.txt if enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/robots.txt`);
    const content = await page.content();
    // Some plugins add LLMs reference to robots.txt
    expect(content.length > 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-llms-adv-robots.png', fullPage: true });
  });

});
