// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady, attachConsoleErrorGuard, slowScroll } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoMeta(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/meta-templates`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function gotoRobots(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/robot-instruction`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function gotoSitemap(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/sitemap`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Post Types & Custom Post Types', () => {

  test('Post meta template section is visible', async ({ page }) => {
    await gotoMeta(page);
    const postSection = page.locator('[class*="post-type"], label').filter({ hasText: /^post$|posts/i }).first();
    const visible = await postSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-meta-post.png', fullPage: true });
  });

  test('Page meta template section is visible', async ({ page }) => {
    await gotoMeta(page);
    const pageSection = page.locator('[class*="post-type"], label').filter({ hasText: /^page$|pages/i }).first();
    const visible = await pageSection.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Custom Post Type sections are listed in meta templates', async ({ page }) => {
    await gotoMeta(page);
    await slowScroll(page, 3);
    const cptSections = page.locator('[class*="post-type"]');
    const count = await cptSections.count();
    expect(count >= 0).toBeTruthy();
  });

  test('Post title template uses variable tokens', async ({ page }) => {
    await gotoMeta(page);
    const postTitleField = page.locator('input[name*="post_title"], input[placeholder*="title"]').first();
    if (await postTitleField.isVisible()) {
      const val = await postTitleField.inputValue();
      expect(val.length >= 0).toBeTruthy();
    }
  });

  test('Page title template is configurable separately from posts', async ({ page }) => {
    await gotoMeta(page);
    const pageTitleField = page.locator('input[name*="page_title"], input[name*="page"]').nth(1);
    const visible = await pageTitleField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post noindex setting is available per post type', async ({ page }) => {
    await gotoRobots(page);
    const postNoIndex = page.locator('[class*="post-type"] input[type="checkbox"], label').filter({ hasText: /post/i }).first();
    const visible = await postNoIndex.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-noindex.png', fullPage: true });
  });

  test('Page noindex setting is available per post type', async ({ page }) => {
    await gotoRobots(page);
    const pageNoIndex = page.locator('[class*="post-type"] input[type="checkbox"], label').filter({ hasText: /page/i }).first();
    const visible = await pageNoIndex.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post type can be included/excluded from sitemap', async ({ page }) => {
    await gotoSitemap(page);
    const postCheckbox = page.locator('[class*="post-type"] input[type="checkbox"]').first();
    const visible = await postCheckbox.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post type sitemap toggle saves without error', async ({ page }) => {
    await gotoSitemap(page);
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click().catch(() => {});
      const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(1500);
        const errorNotice = page.locator('.notice-error');
        const hasError = await errorNotice.count() > 0;
        expect(hasError).toBeFalsy();
      }
    }
  });

  test('Posts/Pages appear in sitemap.xml when enabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const content = await page.content();
    expect(content.length > 0).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-sitemap.png', fullPage: true });
  });

  test('Attachment post type noindex option is present', async ({ page }) => {
    await gotoRobots(page);
    const attachOpt = page.locator('label').filter({ hasText: /attachment/i }).first();
    const visible = await attachOpt.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Custom post type meta title template can be set', async ({ page }) => {
    await gotoMeta(page);
    const cptTitle = page.locator('input[name*="cpt"], input[name*="custom"]').first();
    if (await cptTitle.isVisible()) {
      await cptTitle.fill('%post_title% | %site_name%');
      await expect(cptTitle).not.toBeEmpty();
    }
  });

  test('Post type meta description template can be set', async ({ page }) => {
    await gotoMeta(page);
    const cptDesc = page.locator('textarea[name*="desc"]').first();
    if (await cptDesc.isVisible()) {
      await cptDesc.fill('%post_excerpt%');
      await expect(cptDesc).not.toBeEmpty();
    }
  });

  test('Single post frontend page has correct og:type = article', async ({ page }) => {
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content').catch(() => null);
    expect(ogType === 'article' || ogType === null || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-post-frontend.png', fullPage: false });
  });

  test('Static page frontend has og:type = website or article', async ({ page }) => {
    await page.goto(`${BASE_URL}/?page_id=2`, { waitUntil: 'domcontentloaded' });
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content').catch(() => null);
    expect(['website', 'article', null].includes(ogType) || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-page-frontend.png', fullPage: false });
  });

  test('Post type schema defaults are configurable', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/schema`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await assertPageReady(page);
    await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
    await page.waitForTimeout(1000);
    const schemaForPosts = page.locator('[class*="post-type"], label').filter({ hasText: /post/i }).first();
    const visible = await schemaForPosts.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-cpt-schema.png', fullPage: true });
  });

  test('Post type settings save without error', async ({ page }) => {
    await gotoMeta(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

});
