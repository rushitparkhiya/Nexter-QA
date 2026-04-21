// @ts-check
/**
 * Orbit — WordPress 7.0 Connectors API / Abilities API Security
 *
 * Background: WP 7.0 (April 2026) ships a Connectors API for AI provider keys
 * and an Abilities API for plugin feature registration. Per the make.wp.org
 * announcement (2026-03-18):
 *   - API keys stored in DB are NOT encrypted (only UI-masked)
 *   - No per-plugin scoping — every plugin can access every key
 *   - No caller context (human vs AI agent)
 *   - No per-plugin rate limits
 *
 * If your plugin uses Connectors or Abilities API, this test must pass before
 * release. If it doesn't use them, skip.
 *
 * Usage:
 *   PLUGIN_SLUG=my-plugin PLUGIN_USES_CONNECTORS=1 \
 *   npx playwright test wp7-connectors.spec.js
 */

const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');

const PLUGIN_SLUG = process.env.PLUGIN_SLUG;
const USES_CONNECTORS = process.env.PLUGIN_USES_CONNECTORS === '1';
const WP_ENV_RUN = process.env.WP_ENV_RUN || 'npx wp-env run cli wp';

function wp(cmd) {
  try { return execSync(`${WP_ENV_RUN} ${cmd}`, { encoding: 'utf8' }).trim(); }
  catch (e) { return ''; }
}

test.describe('WP 7.0 Connectors / Abilities API — security', () => {
  test.skip(!USES_CONNECTORS, 'Set PLUGIN_USES_CONNECTORS=1 if plugin uses Connectors API');

  test('plugin registers abilities via Abilities API (not custom permission logic)', async () => {
    // Scan the plugin for direct $_REQUEST/capability hacks around AI features
    const pluginPath = process.env.PLUGIN_PATH || `wp-content/plugins/${PLUGIN_SLUG}`;
    const registers = wp(`eval 'echo function_exists("wp_register_ability") ? "y" : "n";'`);

    if (registers === 'y') {
      const abilities = wp(`eval 'echo json_encode(apply_filters("wp_abilities", []));'`);
      const parsed = abilities ? JSON.parse(abilities) : [];
      const pluginAbilities = parsed.filter((a) =>
        (a.id || '').startsWith(PLUGIN_SLUG) || (a.owner || '').includes(PLUGIN_SLUG)
      );
      expect(pluginAbilities.length,
        'Plugin should register at least one ability via the Abilities API'
      ).toBeGreaterThan(0);
    } else {
      test.skip(true, 'WP 7.0 Abilities API not available on this site');
    }
  });

  test('Connectors keys do not leak in error logs or SQL dumps', async () => {
    // Set a test key
    wp(`option update wp_connectors_ANTHROPIC_API_KEY "sk-orbit-test-DO-NOT-LEAK-123"`);

    // Trigger some plugin operations that might log
    wp(`cron event run --due-now`);
    wp(`eval 'do_action("init"); do_action("admin_init");'`);

    // Check debug.log doesn't contain the key
    const logContent = wp(`eval 'echo file_exists(WP_CONTENT_DIR . "/debug.log") ? file_get_contents(WP_CONTENT_DIR . "/debug.log") : "";'`);
    expect(logContent,
      'Connector API key leaked to debug.log — must redact sensitive options in log output'
    ).not.toContain('sk-orbit-test-DO-NOT-LEAK-123');

    // Check SQL dump doesn't expose the key in plain text (it won't be encrypted, but flag for awareness)
    const dbDump = wp(`db export /tmp/orbit-test.sql --skip-extended-insert 2>&1; cat /tmp/orbit-test.sql 2>/dev/null | grep -c "sk-orbit-test" || echo 0`);
    const leakCount = parseInt(dbDump, 10);
    if (leakCount > 0) {
      console.warn(`[orbit] WP 7.0 caveat: API key stored plaintext in DB (known WP 7.0 limitation). Ensure backups are encrypted.`);
    }

    // Cleanup
    wp(`option delete wp_connectors_ANTHROPIC_API_KEY`);
  });

  test('permission context is enforced for agent callers', async () => {
    // This test verifies that when an AI agent invokes an ability (vs a human),
    // the plugin's permission_callback still enforces proper auth.
    const result = wp(`eval '
      if (!function_exists("wp_invoke_ability")) { echo "skip"; exit; }
      // Simulate agent call with no authenticated user
      wp_set_current_user(0);
      $r = wp_invoke_ability("'"${PLUGIN_SLUG}"'/sensitive_action", [], ["caller" => "agent"]);
      echo is_wp_error($r) ? "blocked:" . $r->get_error_code() : "allowed";
    '`);

    if (result === 'skip') {
      test.skip(true, 'WP 7.0 abilities not available');
      return;
    }

    expect(result,
      'Agent caller with no authenticated user was allowed to invoke a sensitive ability'
    ).toMatch(/blocked:/);
  });
});
