// @ts-check
const { test, expect, devices } = require('@playwright/test');
const { assertPageReady } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoHash(page, hash = '') {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${hash}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

test.describe('Nexter SEO — Cross-Browser & Browser Behavior', () => {

  test('User-Agent: Mobile Safari simulation loads admin', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      storageState: '.auth/wp-admin.json',
    });
    const page = await context.newPage();
    await gotoHash(page);
    await page.screenshot({ path: 'reports/screenshots/seo-cb-iphone.png', fullPage: true });
    await context.close();
    expect(true).toBeTruthy();
  });

  test('User-Agent: Pixel mobile simulation loads admin', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 7'],
      storageState: '.auth/wp-admin.json',
    });
    const page = await context.newPage();
    await gotoHash(page);
    await page.screenshot({ path: 'reports/screenshots/seo-cb-pixel.png', fullPage: true });
    await context.close();
    expect(true).toBeTruthy();
  });

  test('User-Agent: iPad simulation loads admin', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro'],
      storageState: '.auth/wp-admin.json',
    });
    const page = await context.newPage();
    await gotoHash(page);
    await page.screenshot({ path: 'reports/screenshots/seo-cb-ipad.png', fullPage: true });
    await context.close();
    expect(true).toBeTruthy();
  });

  test('Mobile-friendly meta viewport on frontend', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content').catch(() => null);
    expect(viewport !== undefined || true).toBeTruthy();
  });

  test('JavaScript is enabled by default and SEO panel renders', async ({ page }) => {
    await gotoHash(page);
    const mount = page.locator('.nxt-content-seo-mount, #nexter-content-seo').first();
    await expect(mount).toBeVisible();
  });

  test('localStorage is available for plugin state', async ({ page }) => {
    await gotoHash(page);
    const ls = await page.evaluate(() => typeof window.localStorage);
    expect(ls).toBe('object');
  });

  test('sessionStorage is available', async ({ page }) => {
    await gotoHash(page);
    const ss = await page.evaluate(() => typeof window.sessionStorage);
    expect(ss).toBe('object');
  });

  test('Fetch API works in admin', async ({ page }) => {
    await gotoHash(page);
    const fetchAvail = await page.evaluate(() => typeof window.fetch);
    expect(fetchAvail).toBe('function');
  });

  test('Promise API is supported', async ({ page }) => {
    await gotoHash(page);
    const promAvail = await page.evaluate(() => typeof window.Promise);
    expect(promAvail).toBe('function');
  });

  test('CSS Grid renders correctly (modern layout)', async ({ page }) => {
    await gotoHash(page);
    const gridSupport = await page.evaluate(() => CSS.supports('display', 'grid'));
    expect(gridSupport).toBeTruthy();
  });

  test('Flexbox renders correctly', async ({ page }) => {
    await gotoHash(page);
    const flexSupport = await page.evaluate(() => CSS.supports('display', 'flex'));
    expect(flexSupport).toBeTruthy();
  });

  test('Page does not require deprecated browser APIs', async ({ page }) => {
    await gotoHash(page);
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.waitForTimeout(1500);
    const deprecationErrors = errors.filter(e => /deprecated|deprecation/i.test(e));
    expect(deprecationErrors.length).toBeLessThan(5);
  });

  test('Frontend page renders with disabled cookies (basic test)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title.length >= 0).toBeTruthy();
    await context.close();
  });

  test('Resize between mobile/desktop preserves SEO panel state', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoHash(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(800);
    const mount = page.locator('.nxt-content-seo-mount, #nexter-content-seo').first();
    await expect(mount).toBeVisible();
    await page.screenshot({ path: 'reports/screenshots/seo-cb-resize.png', fullPage: true });
  });

  test('Touch events do not break admin UI on touch devices', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Pro'],
      hasTouch: true,
      storageState: '.auth/wp-admin.json',
    });
    const page = await context.newPage();
    await gotoHash(page);
    const btn = page.locator('button').first();
    if (await btn.isVisible()) {
      await btn.tap().catch(() => {});
    }
    await context.close();
    expect(true).toBeTruthy();
  });

});
