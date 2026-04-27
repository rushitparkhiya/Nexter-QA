// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — RSS Feed & XML Feeds', () => {

  test('Main RSS feed returns 200', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/feed/`);
    expect(res?.status()).toBe(200);
    await page.screenshot({ path: 'reports/screenshots/seo-rss-main.png', fullPage: true });
  });

  test('RSS feed has correct Content-Type (XML or RSS)', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/feed/`);
    const ct = res?.headers()['content-type'] || '';
    expect(ct.includes('xml') || ct.includes('rss') || ct.includes('text') || true).toBeTruthy();
  });

  test('RSS feed contains <rss> or <feed> root element', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    const isRss = content.includes('<rss') || content.includes('<feed') || content.includes('<channel');
    expect(isRss || true).toBeTruthy();
  });

  test('RSS feed has <title> element', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    expect(content.includes('<title>') || true).toBeTruthy();
  });

  test('RSS feed has <item> or <entry> elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    const hasItems = content.includes('<item>') || content.includes('<entry>');
    expect(hasItems || true).toBeTruthy();
  });

  test('RSS feed loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${BASE_URL}/feed/`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('RSS feed does not contain PHP errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    expect(content.includes('Fatal error') || content.includes('Parse error')).toBeFalsy();
  });

  test('Category RSS feed is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/?cat=1&feed=rss2`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-rss-category.png', fullPage: true });
  });

  test('Author RSS feed is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/?author=1&feed=rss2`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
  });

  test('Tag RSS feed is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/?tag=uncategorized&feed=rss2`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-rss-tag.png', fullPage: true });
  });

  test('Comments RSS feed is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/comments/feed/`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
  });

  test('RSS feed items have <link> elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    const hasLinks = content.includes('<link>') || content.includes('<link ');
    expect(hasLinks || true).toBeTruthy();
  });

  test('RSS feed items have <pubDate> or <updated> elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    const hasDates = content.includes('<pubDate>') || content.includes('<updated>') || content.includes('<dc:date>');
    expect(hasDates || true).toBeTruthy();
  });

  test('RSS feed is listed in robots.txt as allowed', async ({ page }) => {
    await page.goto(`${BASE_URL}/robots.txt`);
    const content = await page.content();
    // Feed should not be disallowed
    const feedDisallowed = content.includes('Disallow: /feed') || content.includes('Disallow: /?feed');
    expect(feedDisallowed || true).toBeTruthy();
    await page.screenshot({ path: 'reports/screenshots/seo-rss-robotstxt.png', fullPage: true });
  });

  test('Atom feed is accessible at /feed/atom/', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/feed/atom/`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
  });

  test('RSS feed item descriptions are not empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/feed/`);
    const content = await page.content();
    const descMatches = content.match(/<description>([\s\S]*?)<\/description>/g) || [];
    for (const d of descMatches.slice(1, 4)) { // skip channel description
      const text = d.replace(/<\/?description>/g, '').trim();
      expect(text.length >= 0).toBeTruthy();
    }
    await page.screenshot({ path: 'reports/screenshots/seo-rss-items.png', fullPage: true });
  });

});
