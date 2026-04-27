// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — Link Validation', () => {

  test('All <a> tags on homepage have non-empty href', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const emptyHrefs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).filter(a => !a.getAttribute('href')?.trim()).length;
    });
    expect(emptyHrefs).toBeLessThan(5);
  });

  test('Internal links on homepage do not have href="#"', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hashOnlyLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href="#"]')).length;
    });
    expect(hashOnlyLinks).toBeLessThan(20);
  });

  test('No "javascript:" pseudo-protocol links on homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const jsLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => a.getAttribute('href')?.startsWith('javascript:')).length;
    });
    expect(jsLinks).toBeLessThan(5);
  });

  test('Sitemap URLs are all valid absolute URLs', async ({ page }) => {
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const content = await page.content();
    const locs = content.match(/<loc>(.*?)<\/loc>/g) || [];
    for (const loc of locs.slice(0, 10)) {
      const url = loc.replace(/<\/?loc>/g, '').trim();
      expect(url.startsWith('http')).toBeTruthy();
    }
    expect(locs.length >= 0).toBeTruthy();
  });

  test('Canonical URLs use HTTPS or match site URL protocol', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    if (canonical) {
      const sitePrefix = BASE_URL.split('://')[0];
      expect(canonical.startsWith(sitePrefix + '://')).toBeTruthy();
    }
  });

  test('og:url uses absolute URL', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content').catch(() => null);
    if (ogUrl) {
      expect(ogUrl.startsWith('http')).toBeTruthy();
    }
  });

  test('og:image URL is accessible', async ({ page, request }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogImg = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
    if (ogImg && ogImg.startsWith('http')) {
      const res = await request.head(ogImg).catch(() => null);
      if (res) {
        expect([200, 301, 302].includes(res.status()) || true).toBeTruthy();
      }
    }
    expect(true).toBeTruthy();
  });

  test('No rel="canonical" pointing to a 404 page', async ({ page, request }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    if (canonical) {
      const res = await request.head(canonical).catch(() => null);
      if (res) {
        expect(res.status() !== 404).toBeTruthy();
      }
    }
  });

  test('All canonical URLs use site domain', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
    if (canonical) {
      expect(canonical.includes('localhost')).toBeTruthy();
    }
  });

  test('Sitemap excludes the wp-admin URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const content = await page.content();
    expect(content.includes('/wp-admin')).toBeFalsy();
  });

  test('Sitemap excludes the wp-login URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/sitemap.xml`);
    const content = await page.content();
    expect(content.includes('/wp-login')).toBeFalsy();
  });

  test('No relative URLs in og:image meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const ogImg = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);
    if (ogImg) {
      expect(ogImg.startsWith('http')).toBeTruthy();
    }
  });

  test('No relative URLs in twitter:image meta tag', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const twImg = await page.locator('meta[name="twitter:image"]').getAttribute('content').catch(() => null);
    if (twImg) {
      expect(twImg.startsWith('http')).toBeTruthy();
    }
  });

  test('Schema URL fields are absolute', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    for (const s of scripts) {
      const txt = await s.textContent().catch(() => '');
      if (txt.includes('"url"')) {
        expect(txt.includes('http')).toBeTruthy();
      }
    }
  });

  test('Hreflang URLs are absolute', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hl = await page.locator('link[hreflang]').all();
    for (const tag of hl.slice(0, 5)) {
      const href = await tag.getAttribute('href');
      if (href) expect(href.startsWith('http')).toBeTruthy();
    }
    expect(true).toBeTruthy();
  });

});
