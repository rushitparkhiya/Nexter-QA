# Nexter Extension — Upgrade-Regression Agent (design)

> One command → install the OLD version, configure it like a real user, upgrade in
> place to the NEW version (DB preserved), and prove nothing an existing user relies
> on broke. Runs Free **and** Pro, emits one **GO / NO-GO**.

## Why this isn't a copy of the TPAE agent

TPAE is an **Elementor-widgets** plugin → regression = "render every widget before/after, diff pixels."
Nexter Extension is a **site-toolkit / module** plugin → regression = "for every enabled
module, does its **output, DB state, and settings** survive the upgrade?"

So we keep TPAE's *engine skeleton* (install-old → seed → snapshot → upgrade → re-snapshot →
diff → consolidate) but swap the *capture/assert* layer to Nexter's real surfaces.

## The two products (confirmed from the 4.7.0 zips)

| | Free `nexter-extension` | Pro `nexter-pro-extensions` |
|---|---|---|
| Size / PHP | 6.86 MB / 430 files | 0.21 MB / 35 files |
| Nature | full toolkit (SEO, theme-builder, security, perf, snippets, abilities) | thin add-on |
| Dependency | standalone | **hard-depends on Free** (`NEXTER_EXT_VER`); Pro can never be tested alone |
| License | — | EDD updater, `store.posimyth.com`, item_id 99121 |

**Headline for 4.7.0:** the entire **Nexter SEO** module (`content-seo/`) is brand new →
it is the #1 regression surface for this release.

## Lanes

| Lane | npm | What it does | Reuses |
|---|---|---|---|
| **agent** | `regress:agent` | orchestrate Free+Pro → one GO/NO-GO | core |
| **core** | `regress:free` / `regress:pro` | upgrade-in-place engine per edition | docker-compose, wp-setup |
| **static** | `regress:static` | old-vs-new zip: hygiene, fatals, version parity, readme, i18n | `check-*.sh` suite |
| **discover** | `regress:discover` | enumerate modules/abilities/CPT/eval-sites from a zip | — |
| **seo-capture** | (called by core) | snapshot meta/schema/sitemap/robots/redirects/llms | curl |
| **behaviour** | `RUN_SPECS=1` in core | re-run the ~70 `seo:*` + 16 `theme:*` specs before & after | existing specs |

## The core engine — 12 stages (per edition)

1. Boot stack (`db` + `wordpress`, port 8882) + ensure WP core
2. Install **baseline** (old zip; for Pro also install the Free companion first)
3. **Enable ALL modules** + seed fixtures (SEO config, theme-builder templates, a snippet, content)
4. **Baseline snapshot**: `nexter_*` options · abilities registry · SEO HTTP outputs · (opt) spec suites
5. **Upgrade in place** → force-install NEW zip; `wp_data` volume keeps the DB
6. **Candidate snapshot** (same captures)
7. **Diff**: settings survival (no user value silently reset) · abilities still all registered
8. **SEO-output diff**: meta/schema/sitemap(well-formed)/robots/redirects(still 301)/llms
9. **Theme-builder render**: `nxt_builder` templates still render at 3 viewports (screenshot diff)
10. **a11y + Web Vitals** on dashboard (reuse `seo:a11y` / `seo:perf`)
11. **PHP fatal scan** (debug.log) after upgrade
12. **Verdict line** → consumed by the orchestrator

## Consolidation

Worst-of: any edition **FAIL** → ❌ **NO-GO**; any **REVIEW** → ⚠ **GO (conditional)**; else ✅ **GO**.
Pre-existing findings are REVIEW and never flip GO→NO-GO unless *newly introduced* by the upgrade.

## Reuse map (don't rebuild what NEXTER-QA already has)

- **Infra**: `docker-compose.yml` (`db`/`wordpress`/`wp-setup`/`playwright`), `Dockerfile.playwright`, `./zips:/zips`.
- **Static checks**: `check-zip-hygiene.sh`, `check-php-compat.sh`, `check-version-parity.sh`, `check-readme-txt.sh`, `check-pot-file.sh`, `check-plugin-header.sh`, `check-live-cve.sh`, `compare-versions.sh`.
- **Behaviour**: the ~70 `seo:*` + 16 `theme:*` Playwright specs already in `tests/playwright/flows/`.
- **Orbit skills** (via Claude): `orbit-version-compare`, `orbit-seo-schema`, `orbit-seo-sitemap`, `orbit-compat-yoast`, `orbit-compat-rankmath`, `orbit-abilities-api`, `orbit-cron-audit`, `orbit-uninstall-test`, `orbit-wp-security`, `orbit-elementor-compat`, `orbit-qa-regression-pack`.
- **Live UAT (no Docker)**: `rushit.instawp.link` (Free+Pro 4.7.0) and `she-qa.instawp.co` (Free 4.7.0) via Sprout MCP — golden-seed source and a real-site smoke lane.

## What's still TODO (this is a scaffold)

- Stage 3 fixture seeder (replay `golden-options.json` → `wp option update` + recreate templates).
- Stage 7 semantic (key-level) options diff — flag a *reset user value*, ignore *new defaults*.
- Stage 8 SEO-output diff assertions (schema/sitemap validity, redirect codes).
- Stage 9 theme-builder screenshot-diff wiring to `theme:visual`.
- Stage 10 abilities snapshot via a tiny `wp eval`/mu-plugin (WP Abilities API has no stock wp-cli cmd).
