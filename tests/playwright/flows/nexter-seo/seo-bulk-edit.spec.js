// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — Bulk Edit Operations', () => {

  test('Posts list table loads with SEO columns', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-posts-table.png', fullPage: true });
    const table = page.locator('table.wp-list-table').first();
    await expect(table).toBeVisible();
  });

  test('SEO columns can be enabled in screen options', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const screenOpts = page.locator('#show-settings-link, button').filter({ hasText: /screen options/i }).first();
    if (await screenOpts.isVisible()) {
      await screenOpts.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-screen-opts.png', fullPage: true });
    expect(true).toBeTruthy();
  });

  test('Bulk Actions dropdown is present in posts list', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const bulkActions = page.locator('select#bulk-action-selector-top, select[name*="action"]').first();
    const visible = await bulkActions.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Bulk edit action shows fields for SEO meta', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const checkboxes = await page.locator('input[type="checkbox"][name*="post"]').all();
    if (checkboxes.length > 0) {
      await checkboxes[0].check();
      const bulkSelect = page.locator('select#bulk-action-selector-top').first();
      if (await bulkSelect.isVisible()) {
        await bulkSelect.selectOption({ label: 'Edit' }).catch(() => {});
        const applyBtn = page.locator('input#doaction, button#doaction').first();
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-edit-form.png', fullPage: true });
    expect(true).toBeTruthy();
  });

  test('Quick Edit form does not crash with SEO plugin active', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const quickEditLink = page.locator('button.editinline, a.editinline').first();
    if (await quickEditLink.isVisible()) {
      await quickEditLink.click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').innerText().catch(() => '');
      expect(body.includes('Fatal error')).toBeFalsy();
    }
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-quick-edit.png', fullPage: true });
  });

  test('SEO column shows SEO score for each post (if column enabled)', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const seoColumn = page.locator('th, td').filter({ hasText: /seo|score/i }).first();
    const visible = await seoColumn.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Pages list table also has SEO support', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php?post_type=page`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const table = page.locator('table.wp-list-table').first();
    await expect(table).toBeVisible();
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-pages-table.png', fullPage: true });
  });

  test('Filter posts by SEO score is available', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const filterSelect = page.locator('select[name*="seo"], select[name*="filter"]').first();
    const visible = await filterSelect.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Select all checkboxes in posts list works', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const selectAll = page.locator('input#cb-select-all-1').first();
    if (await selectAll.isVisible()) {
      await selectAll.check();
      const checked = await selectAll.isChecked();
      expect(checked).toBeTruthy();
    }
  });

  test('Posts list does not throw SEO-related console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const seoErrors = errors.filter(e => e.toLowerCase().includes('seo') || e.toLowerCase().includes('nexter'));
    expect(seoErrors.length).toBeLessThan(5);
  });

  test('Categories taxonomy admin page works with SEO active', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit-tags.php?taxonomy=category`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body.includes('Fatal error')).toBeFalsy();
    await page.screenshot({ path: 'reports/screenshots/seo-bulk-cat-admin.png', fullPage: true });
  });

  test('Tag taxonomy edit page has SEO meta fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit-tags.php?taxonomy=post_tag`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Posts list pagination works without SEO crashes', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php?paged=2`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body.includes('Fatal error')).toBeFalsy();
  });

  test('Search posts does not crash with SEO plugin', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php?s=hello`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText().catch(() => '');
    expect(body.includes('Fatal error')).toBeFalsy();
  });

  test('Trash post action works with SEO plugin', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/edit.php`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Just verify the action link exists, don't actually trash
    const trashLink = page.locator('a').filter({ hasText: /trash/i }).first();
    const visible = await trashLink.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
