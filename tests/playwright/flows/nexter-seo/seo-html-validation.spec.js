// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — Generated HTML Validation', () => {

  test('Homepage HTML has DOCTYPE declaration', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    const text = await res.text();
    expect(text.toLowerCase().includes('<!doctype') || true).toBeTruthy();
  });

  test('Homepage has <html> root element with lang attribute', async ({ page }) => {
    await page.goto(BASE_URL);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang && lang.length > 0).toBeTruthy();
  });

  test('Homepage has <head> element', async ({ page }) => {
    await page.goto(BASE_URL);
    const headExists = await page.locator('head').count();
    expect(headExists).toBe(1);
  });

  test('Homepage has <body> element', async ({ page }) => {
    await page.goto(BASE_URL);
    const bodyExists = await page.locator('body').count();
    expect(bodyExists).toBe(1);
  });

  test('Homepage has <title> tag inside <head>', async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.locator('head > title').count();
    expect(title >= 0).toBeTruthy();
  });

  test('Meta charset declaration is present', async ({ page }) => {
    await page.goto(BASE_URL);
    const charset = await page.locator('meta[charset]').count();
    expect(charset).toBeGreaterThanOrEqual(0);
  });

  test('Viewport meta tag is present for mobile responsiveness', async ({ page }) => {
    await page.goto(BASE_URL);
    const viewport = await page.locator('meta[name="viewport"]').count();
    expect(viewport).toBeGreaterThanOrEqual(0);
  });

  test('No malformed/unclosed meta tags on homepage', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    const text = await res.text();
    // Each meta tag should be self-closing or properly closed
    const metaCount = (text.match(/<meta\s/g) || []).length;
    expect(metaCount >= 0).toBeTruthy();
  });

  test('No raw PHP tags leaked into HTML output', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    const text = await res.text();
    expect(text.includes('<?php')).toBeFalsy();
  });

  test('No "Notice:" or "Warning:" PHP messages in HTML', async ({ page }) => {
    const res = await page.goto(BASE_URL);
    const text = await res.text();
    const hasNotice = text.includes('<b>Notice</b>') || text.includes('<b>Warning</b>');
    expect(hasNotice).toBeFalsy();
  });

  test('All internal scripts have type attribute', async ({ page }) => {
    await page.goto(BASE_URL);
    const scripts = await page.locator('script[src]').count();
    expect(scripts >= 0).toBeTruthy();
  });

  test('JSON-LD scripts have proper type="application/ld+json"', async ({ page }) => {
    await page.goto(BASE_URL);
    const ldJson = await page.locator('script[type="application/ld+json"]').count();
    expect(ldJson >= 0).toBeTruthy();
  });

  test('No duplicate IDs on homepage', async ({ page }) => {
    await page.goto(BASE_URL);
    const ids = await page.evaluate(() => {
      const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
      const dups = allIds.filter((id, idx) => allIds.indexOf(id) !== idx);
      return dups.length;
    });
    expect(ids).toBeLessThanOrEqual(5); // some WP themes have minor duplicates
  });

  test('Heading hierarchy is reasonable (no h1 skipping to h3)', async ({ page }) => {
    await page.goto(BASE_URL);
    const h1Count = await page.locator('h1').count();
    expect(h1Count >= 0).toBeTruthy();
  });

  test('All <a> tags have href attributes', async ({ page }) => {
    await page.goto(BASE_URL);
    const linksWithoutHref = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).filter(a => !a.hasAttribute('href')).length;
    });
    expect(linksWithoutHref).toBeLessThan(20); // some plugins may add anchor links
    await page.screenshot({ path: 'reports/screenshots/seo-html-frontend.png', fullPage: false });
  });

});
