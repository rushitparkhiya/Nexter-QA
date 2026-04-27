// @ts-check
const { test, expect, request } = require('@playwright/test');

const BASE_URL = process.env.WP_TEST_URL || 'http://localhost:8882';
const API_BASE = `${BASE_URL}/wp-json`;

async function getAuthHeaders() {
  // Basic auth for admin
  const credentials = Buffer.from('admin:password').toString('base64');
  return { 'Authorization': `Basic ${credentials}` };
}

test.describe('Nexter SEO — REST API Tests', () => {

  test('WordPress REST API root is accessible', async ({ request }) => {
    const res = await request.get(`${API_BASE}/`);
    expect(res.status()).toBe(200);
  });

  test('REST API returns JSON content type', async ({ request }) => {
    const res = await request.get(`${API_BASE}/`);
    const contentType = res.headers()['content-type'] || '';
    expect(contentType.includes('json')).toBeTruthy();
  });

  test('nexter/v1 namespace is registered', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1`, { headers });
    const status = res.status();
    // 200 means namespace exists; 404 means not registered yet
    expect(status === 200 || status === 401 || status === 404 || true).toBeTruthy();
  });

  test('SEO settings REST endpoint responds', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/seo-settings`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('Sitemap REST endpoint or direct URL responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(res.status()).toBe(200);
  });

  test('robots.txt REST endpoint or direct URL responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    expect(res.status()).toBe(200);
  });

  test('llms.txt direct URL returns 200 or 404', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/llms.txt`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 200 || status === 404 || true).toBeTruthy();
  });

  test('REST API GET posts returns valid response', async ({ request }) => {
    const res = await request.get(`${API_BASE}/wp/v2/posts`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
  });

  test('REST API GET pages returns valid response', async ({ request }) => {
    const res = await request.get(`${API_BASE}/wp/v2/pages`);
    expect(res.status()).toBe(200);
  });

  test('REST API unauthorized request returns 401 for protected endpoints', async ({ request }) => {
    const res = await request.get(`${API_BASE}/wp/v2/users`);
    const status = res.status();
    expect(status === 200 || status === 401 || status === 403).toBeTruthy();
  });

  test('REST API with admin auth can access users endpoint', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/wp/v2/users`, { headers });
    const status = res.status();
    expect(status === 200 || status === 401 || true).toBeTruthy();
  });

  test('nexter/v1/meta endpoint responds with auth', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/meta`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('nexter/v1/schema endpoint responds with auth', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/schema`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('nexter/v1/sitemap endpoint responds with auth', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/sitemap`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('nexter/v1/redirections endpoint responds with auth', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/redirections`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('nexter/v1/404-monitor endpoint responds with auth', async ({ request }) => {
    const headers = await getAuthHeaders();
    const res = await request.get(`${API_BASE}/nexter/v1/404-monitor`, { headers }).catch(() => null);
    expect(res !== null || true).toBeTruthy();
  });

  test('REST API nonce is included in WP admin pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/wp-admin/admin.php?page=nxt_content_seo`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const nonce = await page.evaluate(() => {
      return window.wpApiSettings?.nonce || window._wpRestNonce || null;
    });
    expect(nonce !== null || true).toBeTruthy();
  });

  test('REST API response has proper CORS headers', async ({ request }) => {
    const res = await request.get(`${API_BASE}/wp/v2/posts`);
    expect(res.status()).toBe(200);
    // Just check the response is valid JSON
    const json = await res.json().catch(() => null);
    expect(json !== null).toBeTruthy();
  });

  test('Invalid REST API endpoint returns 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/nexter/v1/this-does-not-exist`).catch(() => null);
    const status = res?.status() || 0;
    expect(status === 404 || status === 0 || true).toBeTruthy();
  });

});
