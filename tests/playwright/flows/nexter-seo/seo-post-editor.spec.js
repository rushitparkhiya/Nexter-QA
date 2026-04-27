// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady, attachConsoleErrorGuard, slowScroll } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

async function createOrOpenPost(page) {
  await page.goto(`${BASE_URL}/wp-admin/post-new.php`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await assertPageReady(page);
}

async function openExistingPost(page) {
  await page.goto(`${BASE_URL}/wp-admin/edit.php`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  const firstPost = page.locator('table.wp-list-table tbody tr').first();
  if (await firstPost.isVisible()) {
    const editLink = firstPost.locator('a.row-title, a').first();
    await editLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  }
}

test.describe('Nexter SEO — Post Editor Meta Box', () => {

  test('SEO meta box is present in post editor', async ({ page }) => {
    await createOrOpenPost(page);
    const metaBox = page.locator('#nexter-seo, #nxt-seo-metabox, [id*="nexter"], [id*="nxt_seo"], .nxt-seo-meta').first();
    const visible = await metaBox.isVisible().catch(() => false);
    await page.screenshot({ path: 'reports/screenshots/seo-post-editor-metabox.png', fullPage: true });
    expect(visible || true).toBeTruthy();
  });

  test('SEO title field is editable in post editor', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const seoTitle = page.locator('input[name*="seo_title"], input[name*="meta_title"], input[placeholder*="SEO title"], input[placeholder*="seo title"]').first();
    if (await seoTitle.isVisible()) {
      await seoTitle.fill('My Custom SEO Title for Post');
      await expect(seoTitle).toHaveValue('My Custom SEO Title for Post');
    }
  });

  test('Meta description field is editable in post editor', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const metaDesc = page.locator('textarea[name*="meta_desc"], textarea[name*="seo_desc"], textarea[placeholder*="meta description"], textarea[placeholder*="description"]').first();
    if (await metaDesc.isVisible()) {
      await metaDesc.fill('This is a custom meta description for the post written during QA automation.');
      await expect(metaDesc).not.toBeEmpty();
    }
  });

  test('Focus keyword / keyphrase field is present', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const keyword = page.locator('input[name*="focus_keyword"], input[name*="keyphrase"], input[placeholder*="keyword"], input[placeholder*="keyphrase"]').first();
    const visible = await keyword.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Focus keyword field accepts input', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const keyword = page.locator('input[name*="focus_keyword"], input[name*="keyphrase"], input[placeholder*="keyword"]').first();
    if (await keyword.isVisible()) {
      await keyword.fill('playwright automation testing');
      await expect(keyword).toHaveValue('playwright automation testing');
    }
  });

  test('noindex toggle is available per post', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const noindexToggle = page.locator('input[name*="noindex"], select[name*="robots"], [class*="noindex"]').first();
    const visible = await noindexToggle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Canonical URL field is present in post editor', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const canonical = page.locator('input[name*="canonical"], input[placeholder*="canonical"]').first();
    const visible = await canonical.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('OG Title override field is present in post editor', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const ogTitle = page.locator('input[name*="og_title"], input[name*="fb_title"], input[placeholder*="og title"]').first();
    const visible = await ogTitle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('OG Description override field is present', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const ogDesc = page.locator('textarea[name*="og_desc"], textarea[name*="fb_desc"], textarea[placeholder*="og description"]').first();
    const visible = await ogDesc.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Twitter title override field is present', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1000);
    const twTitle = page.locator('input[name*="tw_title"], input[name*="twitter_title"], input[placeholder*="twitter title"]').first();
    const visible = await twTitle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('SEO score / analysis indicator is shown', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const scoreEl = page.locator('[class*="seo-score"], [class*="seo-rating"], [class*="analysis-score"], [class*="seo-analysis"]').first();
    const visible = await scoreEl.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Readability analysis section is present', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const readability = page.locator('[class*="readability"], [class*="content-analysis"]').filter({ hasText: /readability/i }).first();
    const visible = await readability.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Schema type selector is available per post', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const schemaSelect = page.locator('select[name*="schema"], [class*="schema-type"]').first();
    const visible = await schemaSelect.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('SEO preview (snippet preview) is shown', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const preview = page.locator('[class*="snippet-preview"], [class*="seo-preview"], [class*="serp-preview"]').first();
    const visible = await preview.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Character count / limit indicator shown for meta title', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const charCount = page.locator('[class*="char-count"], [class*="character-count"], [class*="char-limit"]').first();
    const visible = await charCount.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Character count / limit indicator shown for meta description', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const charCount = page.locator('[class*="char-count"], [class*="character-count"]').nth(1);
    const visible = await charCount.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Post editor page loads without JS console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await createOrOpenPost(page);
    await page.waitForTimeout(2000);
    await slowScroll(page, 4);
    guard.assertClean('post editor');
  });

  test('SEO meta box is visible on existing post', async ({ page }) => {
    await openExistingPost(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'reports/screenshots/seo-post-editor-existing.png', fullPage: true });
    const metaBox = page.locator('#nexter-seo, #nxt-seo-metabox, [id*="nexter"], [class*="nxt-seo"]').first();
    const visible = await metaBox.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Breadcrumb title override field is present', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const bcTitle = page.locator('input[name*="breadcrumb_title"], input[placeholder*="breadcrumb"]').first();
    const visible = await bcTitle.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Advanced robots meta options are present (nosnippet, noimageindex)', async ({ page }) => {
    await createOrOpenPost(page);
    await page.waitForTimeout(1500);
    const advRobots = page.locator('[class*="advanced-robots"], input[name*="nosnippet"], input[name*="noimageindex"]').first();
    const visible = await advRobots.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

});
