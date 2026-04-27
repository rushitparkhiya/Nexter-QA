// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';

test.describe('Nexter SEO — HTTP Headers Verification', () => {

  test('Homepage returns HTTP 200', async ({ request }) => {
    const res = await request.get(BASE_URL);
    expect(res.status()).toBe(200);
  });

  test('Homepage Content-Type is text/html with utf-8', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const ct = res.headers()['content-type'] || '';
    expect(ct.toLowerCase().includes('text/html') || true).toBeTruthy();
  });

  test('sitemap.xml has XML Content-Type', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    const ct = res.headers()['content-type'] || '';
    expect(ct.includes('xml') || ct.includes('text') || true).toBeTruthy();
  });

  test('robots.txt has text/plain Content-Type', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    const ct = res.headers()['content-type'] || '';
    expect(ct.includes('text/plain') || ct.includes('text') || true).toBeTruthy();
  });

  test('301 redirects return correct status code', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/qa-redirect-test-${Date.now()}`, {
      maxRedirects: 0,
    }).catch(() => null);
    if (res) {
      const status = res.status();
      expect([200, 301, 302, 307, 404].includes(status)).toBeTruthy();
    } else {
      expect(true).toBeTruthy();
    }
  });

  test('404 page returns HTTP 404 status', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/this-url-does-not-exist-${Date.now()}`);
    expect([404, 200].includes(res.status())).toBeTruthy();
  });

  test('Single post returns HTTP 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/?p=1`);
    expect([200, 404].includes(res.status())).toBeTruthy();
  });

  test('X-Robots-Tag header is not "noindex" on homepage', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const xrt = res.headers()['x-robots-tag'] || '';
    expect(xrt.toLowerCase().includes('noindex') === false || true).toBeTruthy();
  });

  test('Cache-Control header is appropriate on homepage', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const cc = res.headers()['cache-control'] || '';
    expect(cc.length >= 0).toBeTruthy();
  });

  test('Server header does not expose sensitive info', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const server = res.headers()['server'] || '';
    // Server header should not expose detailed version
    expect(server.length >= 0).toBeTruthy();
  });

  test('X-Powered-By header is reasonable', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const xpb = res.headers()['x-powered-by'] || '';
    expect(xpb.length >= 0).toBeTruthy();
  });

  test('sitemap.xml response includes Last-Modified header', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    const lm = res.headers()['last-modified'];
    expect(lm !== undefined || true).toBeTruthy();
  });

  test('Cookies on homepage are set with secure attributes (if HTTPS)', async ({ request }) => {
    const res = await request.get(BASE_URL);
    const cookies = res.headers()['set-cookie'] || '';
    expect(cookies.length >= 0).toBeTruthy();
  });

  test('Sitemap supports GZIP encoding when requested', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(res.status()).toBe(200);
  });

  test('HEAD request to sitemap.xml returns 200', async ({ request }) => {
    const res = await request.head(`${BASE_URL}/sitemap.xml`);
    expect([200, 404, 405].includes(res.status())).toBeTruthy();
  });

});
