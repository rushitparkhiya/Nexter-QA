# Regression fixtures

The engine needs a **fully-configured "existing user" site** BEFORE the upgrade, so
the diff has something to protect. `regression-seed.json` describes that state.

## Fastest way to build the golden seed (recommended)

Don't hand-write every option. **Export a real, fully-configured site's Nexter
options and replay them.** `rushit.instawp.link` already runs Free 4.7.0 + Pro 4.7.0
with essentially every module ON — it's the perfect golden source.

```bash
# Via Sprout MCP (super-brain / wp-cli) on the live site:
wp option list --search='nexter*' --format=json  > fixtures/golden-options.json
wp post list --post_type=nxt_builder --format=json > fixtures/golden-templates.json
```

Then the seeder replays `golden-options.json` with `wp option update` and recreates
the `nxt_builder` templates. This guarantees the fixture matches a real support-grade
configuration instead of a guess.

## What the seed must cover (so the upgrade diff is meaningful)

| Surface | Seed |
|---|---|
| SEO | meta template, an OG default image, a Schema (Article) rule, sitemap ON, one 301 redirect, robots rules, IndexNow key, llms.txt ON |
| Theme Builder | one `nxt_builder` header + footer + 404 template (Elementor and/or Gutenberg) |
| Modules | flip ON: SMTP, image-optimize, limit-login, custom-login-url, heartbeat, svg-upload, post-duplicator, disable-gutenberg |
| Pro | 2FA on a user, maintenance mode config, media-replacement, white-label |
| Content | 1 post + 1 page + 1 product (Woo) so SEO/theme-builder have real targets |

## Status
`regression-seed.json` is a **schema stub** — the seeder in `run-regression-core.sh`
(stage 3) reads it. Populate it from `golden-options.json` and wire the seeder.
