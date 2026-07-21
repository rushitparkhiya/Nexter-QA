---
name: nexter-regression-agent
description: Orchestrator agent for upgrade-regression of Nexter Extension (Free + Pro). Runs both editions in one pass and emits a single consolidated GO / NO-GO release decision. Auto-detects the newest two zips per edition in this repo's zips/ folder, then drives the per-edition engine (boot WP/PHP Docker → install Free (+Free companion for Pro) baseline → seed permalinks/content → snapshot options+abilities → upgrade in place with DB preserved → enable SEO module + golden config → re-snapshot → diff settings survival, abilities registry, SEO output, schema deference → PHP fatal scan), and consolidates both editions into one verdict. Use when the user says "run nexter regression agent", "regress nexter", "go/no-go on nexter release", "test nexter upgrade for free and pro", or drops Nexter Extension zips and asks for a release decision. Do NOT use for TPAE or the Nexter THEME (different products).
argument-hint: [--edition free|pro|both]
---

# 🤖 nexter-regression-agent — Free + Pro upgrade regression, one verdict

Runs both editions of an upgrade regression and returns a single **GO / NO-GO** with evidence.
This is a **project skill** — it ships inside the NEXTER-QA repo, so cloning the repo is all a
teammate needs to get it. Full design: `docs/REGRESSION-DESIGN.md` · setup: `docs/TEAM-SETUP.md`.

## Prerequisites (one-time, per machine)
1. **Docker Desktop** running (Lane 2 boots a WP container).
2. **Node.js 18+** and `npm install` in the repo (Playwright + helpers).
3. **Claude Code** opened on this repo (this skill auto-loads from `.claude/skills/`).
4. *(Optional, for the live MCP lane)* access to the team's Sprout MCP site(s). Without it, the
   agent still runs Lanes 1 (static) + 2 (Docker); Lane 3 is skipped.

## The command (run from the repo root)
```bash
npm run regress:agent                 # both editions, newest 2 zips each → one verdict
npm run regress:free                  # one edition
npm run regress:pro
npm run regress:static -- --old zips/nexter-free-<old>.zip --new zips/nexter-free-<new>.zip
```
Or just tell Claude: **"run nexter regression agent"**.
Consolidated output → `reports/regress/<ts>/AGENT-VERDICT.md`.

## Normal flow (when someone drops new zips)
1. Put the NEW zip(s) in `zips/` with canonical names: `nexter-free-X.Y.Z.zip`, `nexter-pro-X.Y.Z.zip`.
2. Make sure the PREVIOUS release is also in `zips/` (the diff needs an OLD baseline).
3. `npm run regress:agent` (auto-detects newest two per edition).
4. Read `AGENT-VERDICT.md`; relay GO/NO-GO + findings + any NX-R* reappearance.
5. Docker down / zip missing → surface and stop; don't hand-patch.

## What the engine does per edition (12 stages)
boot → install baseline (old) → **seed permalinks+front-page+content** → snapshot options+abilities
→ **upgrade in place (DB preserved)** → **enable SEO module + golden config** → re-snapshot →
diff settings survival + abilities registry → **SEO live output + NX-R02 schema-deference auto-catch
(static + live Yoast double-schema)** → PHP fatal scan → verdict. Orchestrator consolidates worst-of:
any FAIL → ❌ NO-GO; any REVIEW → ⚠ GO (conditional); else ✅ GO.

## Landmines (baked in — don't re-debug)
1. Pro hard-depends on Free (`NEXTER_EXT_VER`) → a Free companion is always installed first.
2. Windows git-bash mangles container paths → `MSYS_NO_PATHCONV=1` (in `scripts/lib/regress-common.sh`).
3. `wp-setup` entrypoint is `sh -c` → pass one string; use the `wpc` helper.
4. Rewrite flush is version-gated on `admin_init` → hit `/wp-admin/` once post-upgrade before asserting `nxt_builder` permalinks.
5. "options changed" after upgrade is usually just NEW SEO defaults — a regression is a *user value reset*, not a new default.
6. Abilities need the **WP 7.0** API (`wp_get_abilities`). The default docker image may be older; bump `docker-compose.yml` to a WP 7.0 image to test abilities in Lane 2 (the live lane covers this on 7.0).
7. `eval()` in Code Snippets is by-design (like WPCode) — security-watch, not a leak.
8. Sitemap on a **plain-permalink** site 404s on pretty URLs but works at `/?nxt_sitemap=1` — check `permalink_structure` before flagging.

## Standing focus (regression pack — see docs/REGRESSION-PACK.md)
NX-R01 SEO og:image SSRF · NX-R02 schema/sitemap must defer to Yoast/RankMath · NX-R03 all abilities register.
A reappearance of any NX-R* = NO-GO.

## Role rules (hard)
- Test-script bugs (engine/fixtures) → fix. Plugin (Nexter zip) bugs → report only, NEVER fix.
- Never commit or push unless the user asks. Surface env failures and stop — don't fake green.
