# Nexter regression — runbook & landmines

## Quick start

```bash
cd C:/Users/rushi/Downloads/GitHub/NEXTER-QA

# 1. Put the OLD (baseline) and NEW (candidate) zips in ./zips with canonical names:
#      zips/nexter-free-4.6.17.zip   zips/nexter-free-4.7.0.zip
#      zips/nexter-pro-4.6.17.zip    zips/nexter-pro-4.7.0.zip
#    (4.7.0 zips are already staged. Drop the previous release as the baseline.)

# 2. Fast static gate (no Docker):
npm run regress:static -- --old zips/nexter-free-4.6.17.zip --new zips/nexter-free-4.7.0.zip

# 3. Full upgrade regression, both editions, one verdict:
npm run regress:agent
#   → reports/regress/<ts>/AGENT-VERDICT.md

# One edition / explicit versions:
npm run regress:free
npm run regress:pro
npm run regress:agent -- --old-free zips/nexter-free-4.6.17.zip --new-free zips/nexter-free-4.7.0.zip
```

## How upgrade-in-place works here
The `wordpress` + `wp-setup` services mount `./zips:/zips`. The engine installs the
OLD zip, seeds a real config, then `wp plugin install /zips/<new> --force` upgrades
over it. The **DB lives in the `wp_data` volume**, so it survives the swap — that's
what makes it an *upgrade* test, not a fresh install. To start clean: `docker compose down -v`.

## Landmines (baked in — don't re-debug)

1. **Pro needs Free.** `nexter-pro-extensions` bails with an admin notice unless
   `NEXTER_EXT_VER` is defined. The engine always installs a Free companion before Pro.
2. **Windows git-bash path mangling.** `/var/www/html` and `/zips` get rewritten →
   `export MSYS_NO_PATHCONV=1` (already in `regress-common.sh`).
3. **wp-setup entrypoint is `sh -c`.** Pass one string: `docker compose run --rm wp-setup 'wp ...'`.
   The `wpc` helper does this for you.
4. **Rewrite flush is version-gated** (`nexter_ext_rewrite_ver` vs `NEXTER_EXT_REWRITE_VER`,
   runs on `admin_init`). After upgrade, hit a `/wp-admin/` URL once so the flush fires
   before asserting `nxt_builder` permalinks (NX-R14).
5. **"options changed" after upgrade is often FINE.** 4.7.0 adds new SEO defaults →
   new keys appear. A regression is a *user-set value being reset*, not a *new default*.
   Stage 7 must diff semantically, not byte-wise.
6. **Abilities have no stock wp-cli command.** Snapshot via `wp eval` on
   `wp_get_abilities()` (or a tiny mu-plugin). Count must equal baseline (NX-R03).
7. **eval() in Code Snippets is by-design** (PHP/CSS/JS/HTML manager, like WPCode).
   Don't flag as a leak — but it's the top security surface; keep `orbit-wp-security` on it.
8. **Default WP image is PHP 8.1** (`wordpress:6.7.2-php8.1-apache`). Nexter floor is
   PHP 7.4 / WP 5.9. For a floor run, override the image in `docker-compose.yml` or via env.

## Golden seed from a live site (skip hand-authoring fixtures)
`rushit.instawp.link` runs Free+Pro 4.7.0 with every module ON. Export its `nexter_*`
options + `nxt_builder` posts (via Sprout MCP wp-cli) into `fixtures/golden-options.json`
and replay them as the baseline config. See `fixtures/README.md`.

## Live-site smoke lane (no Docker)
For a same-day check, run assertions directly against `rushit.instawp.link` (Free+Pro
4.7.0) or `she-qa.instawp.co` (Free 4.7.0) through Sprout MCP — good to validate the
NX-R* pack against the real shipped build before investing Docker time.

## Housekeeping
Two empty junk dirs exist in the repo root from an older botched command:
`reports;C` and `scripts;C` (created 2026-06-22, both empty). Safe to delete:
`rm -rf './reports;C' './scripts;C'`.
