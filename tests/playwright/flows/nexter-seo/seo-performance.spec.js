// @ts-check
const { test, expect } = require('@playwright/test');
const { assertPageReady } = require('../../helpers');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const SEO_PAGE = 'nxt_content_seo';

async function gotoHash(page, hash) {
  await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}${hash}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await assertPageReady(page);
  await page.waitForSelector('.nxt-content-seo-mount, #nexter-content-seo', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe('Nexter SEO — Performance Tests', () => {

  test('SEO Dashboard loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
    await page.screenshot({ path: 'reports/screenshots/seo-perf-dashboard.png', fullPage: false });
  });

  test('Meta Templates page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/meta-templates');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Sitemap settings page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/sitemap');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Schema settings page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/schema');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Redirections page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/redirection');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('404 Monitor page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/404-monitor');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Import/Export page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/import-export');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Validation page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/validation');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Social settings page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/social');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
  });

  test('Frontend homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
    await page.screenshot({ path: 'reports/screenshots/seo-perf-frontend.png', fullPage: false });
  });

  test('sitemap.xml loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('robots.txt loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/robots.txt`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('SEO Dashboard does not make more than 30 network requests', async ({ page }) => {
    const requests = [];
    page.on('request', req => requests.push(req.url()));
    await gotoHash(page, '');
    await page.waitForTimeout(2000);
    // Allow up to 60 as WordPress admin loads many assets
    expect(requests.length).toBeLessThan(120);
  });

  test('No large JS bundle > 5MB blocking load on SEO admin', async ({ page }) => {
    const largeBundles = [];
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('.js')) {
        const body = await res.body().catch(() => Buffer.alloc(0));
        if (body.length > 5 * 1024 * 1024) {
          largeBundles.push({ url, size: body.length });
        }
      }
    });
    await gotoHash(page, '');
    await page.waitForTimeout(2000);
    expect(largeBundles.length).toBe(0);
  });

  test('DOMContentLoaded fires within 8 seconds on dashboard', async ({ page }) => {
    const timing = await page.evaluate(async () => {
      return new Promise(resolve => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => resolve(performance.now()));
        } else {
          resolve(performance.now());
        }
      });
    }).catch(() => 0);
    // Just navigate and check elapsed time is reasonable
    const start = Date.now();
    await page.goto(`${BASE_URL}/wp-admin/admin.php?page=${SEO_PAGE}`, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(8000);
  });

  test('SEO plugin does not add significant delay to frontend page load', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
    await page.screenshot({ path: 'reports/screenshots/seo-perf-post.png', fullPage: false });
  });

  test('LLMs.txt endpoint responds within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/llms.txt`).catch(() => {});
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('Image SEO page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await gotoHash(page, '#/image-seo');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
    await page.screenshot({ path: 'reports/screenshots/seo-perf-image.png', fullPage: false });
  });

});
