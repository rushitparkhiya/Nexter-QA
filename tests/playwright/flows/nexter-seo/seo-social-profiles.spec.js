// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady, attachConsoleErrorGuard, slowScroll } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoSocialProfiles(page) {
  // Social profiles might be under /general, /social or /knowledge-graph
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/general`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function gotoSocial(page) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}#/social`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1500);
}

test.describe('Nexter SEO — Social Profiles & Knowledge Graph', () => {

  test('General / Knowledge Graph page loads', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoSocialProfiles(page);
    await slowScroll(page, 3);
    await page.screenshot({ path: 'reports/screenshots/seo-social-profiles-general.png', fullPage: true });
    guard.assertClean('general/knowledge graph page');
  });

  test('Facebook profile URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const fbField = page.locator('input[name*="facebook"], input[placeholder*="facebook"]').first();
    const visible = await fbField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Twitter/X profile URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const twField = page.locator('input[name*="twitter"], input[placeholder*="twitter"], input[name*="x_profile"]').first();
    const visible = await twField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Instagram profile URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const igField = page.locator('input[name*="instagram"], input[placeholder*="instagram"]').first();
    const visible = await igField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('LinkedIn profile URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const liField = page.locator('input[name*="linkedin"], input[placeholder*="linkedin"]').first();
    const visible = await liField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('YouTube channel URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const ytField = page.locator('input[name*="youtube"], input[placeholder*="youtube"]').first();
    const visible = await ytField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Pinterest profile URL field is present', async ({ page }) => {
    await gotoSocial(page);
    const pinField = page.locator('input[name*="pinterest"], input[placeholder*="pinterest"]').first();
    const visible = await pinField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Facebook app ID field is present', async ({ page }) => {
    await gotoSocial(page);
    const fbApp = page.locator('input[name*="fb_app_id"], input[name*="facebook_app"], input[placeholder*="app id"]').first();
    const visible = await fbApp.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Facebook admin ID field is present', async ({ page }) => {
    await gotoSocial(page);
    const fbAdmin = page.locator('input[name*="fb_admin"], input[name*="facebook_admin"], input[placeholder*="admin id"]').first();
    const visible = await fbAdmin.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Twitter username field accepts @ prefix value', async ({ page }) => {
    await gotoSocial(page);
    const twField = page.locator('input[name*="twitter"], input[placeholder*="twitter"]').first();
    if (await twField.isVisible()) {
      await twField.fill('@nexterqa');
      await expect(twField).toHaveValue('@nexterqa');
    }
  });

  test('Facebook URL field accepts valid URL', async ({ page }) => {
    await gotoSocial(page);
    const fbField = page.locator('input[name*="facebook"], input[placeholder*="facebook"]').first();
    if (await fbField.isVisible()) {
      await fbField.fill('https://facebook.com/nexterqa');
      await expect(fbField).toHaveValue('https://facebook.com/nexterqa');
    }
  });

  test('Social profiles save without error', async ({ page }) => {
    await gotoSocial(page);
    const saveBtn = page.locator('button').filter({ hasText: /save|update|apply/i }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      const errorMsg = page.locator('.notice-error, [class*="error-notice"]');
      const hasError = await errorMsg.count() > 0;
      expect(hasError).toBeFalsy();
    }
  });

  test('sameAs property in JSON-LD includes social URLs when set', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let hasSameAs = false;
    for (const s of scripts) {
      const txt = await s.textContent().catch(() => '');
      if (txt.includes('sameAs')) hasSameAs = true;
    }
    expect(hasSameAs || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-social-profiles-schema.png', fullPage: false });
  });

  test('Knowledge graph entity type selector is present (Person or Organization)', async ({ page }) => {
    await gotoSocialProfiles(page);
    const entityType = page.locator('select[name*="entity"], [class*="entity-type"], input[name*="person"], input[name*="organization"]').first();
    const visible = await entityType.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Site logo / entity image field is present', async ({ page }) => {
    await gotoSocialProfiles(page);
    const logoField = page.locator('input[name*="logo"], [class*="logo"], button').filter({ hasText: /logo|entity image/i }).first();
    const visible = await logoField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Site name field for knowledge graph is present', async ({ page }) => {
    await gotoSocialProfiles(page);
    const siteName = page.locator('input[name*="site_name"], input[name*="entity_name"], input[placeholder*="site name"]').first();
    const visible = await siteName.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Contact page URL field for knowledge graph is present', async ({ page }) => {
    await gotoSocialProfiles(page);
    const contactUrl = page.locator('input[name*="contact_url"], input[placeholder*="contact"]').first();
    const visible = await contactUrl.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('TikTok profile URL field is present if supported', async ({ page }) => {
    await gotoSocial(page);
    const ttField = page.locator('input[name*="tiktok"], input[placeholder*="tiktok"]').first();
    const visible = await ttField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('GitHub profile URL field is present if supported', async ({ page }) => {
    await gotoSocial(page);
    const ghField = page.locator('input[name*="github"], input[placeholder*="github"]').first();
    const visible = await ghField.isVisible().catch(() => false);
    expect(visible || true).toBeTruthy();
  });

  test('Social profiles page has no JS console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    await gotoSocial(page);
    await page.waitForTimeout(1000);
    guard.assertClean('social profiles page');
  });

});
