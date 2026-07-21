# Nexter Regression Agent — Team Setup

A one-command upgrade-regression agent for **Nexter Extension** (Free + Pro). It tests every new
release three ways — static code diff, Docker upgrade, and live-site checks — and returns a single
**GO / NO-GO**.

## 1. Install once (per machine)
| Need | How |
|---|---|
| Git | clone this repo: `git clone https://github.com/rushitparkhiya/Nexter-QA.git` |
| Docker Desktop | install + keep it running (Lane 2 boots a WordPress container) |
| Node.js 18+ | then in the repo: `npm install` |
| Claude Code | open the cloned repo folder in Claude Code — the `/nexter-regression-agent` skill loads automatically from `.claude/skills/` |
| *(optional)* Sprout MCP | for the live-site lane. Ask the team lead for the MCP config. Without it, static + Docker lanes still run. |

## 2. Add the plugin zips
Zips are **not** committed (`zips/*.zip` is gitignored). Drop them in `zips/` with these names:
```
zips/nexter-free-<old>.zip     zips/nexter-free-<new>.zip
zips/nexter-pro-<old>.zip      zips/nexter-pro-<new>.zip
```
- `<new>` = the release you're testing. `<old>` = the previous release (the diff needs a baseline).
- Free zips: WordPress.org or the build. Pro zips: `store.posimyth.com`.

## 3. Run it
```bash
npm run regress:agent        # both editions, newest 2 zips each → one verdict
```
…or just open Claude Code and say **“run nexter regression agent.”**

Result → `reports/regress/<timestamp>/AGENT-VERDICT.md` (GO / NO-GO + per-edition findings).

## 4. Read the result
- **✅ GO** — safe to ship.
- **⚠ GO (conditional)** — ship-able, but review the listed items.
- **❌ NO-GO** — a blocker (e.g. a security issue or a PHP fatal on upgrade). Details in the report.

## What it checks (3 lanes)
1. **Static** — old vs new code diff: new files, security (XSS/SSRF/SQLi/nonce), the `NX-R*` bug pack.
2. **Docker** — installs old → seeds real config → upgrades to new (DB preserved) → checks nothing broke, zero PHP fatals, SEO output emits.
3. **Live (MCP)** — asserts against the real running site: no fatals, abilities register, SEO endpoints correct.

## Handy docs
- `docs/REGRESSION-DESIGN.md` — how it works, all lanes.
- `docs/REGRESSION-PACK.md` — the `NX-R*` bugs it guards against.
- `docs/REGRESSION-RUNBOOK.md` — landmines + troubleshooting.

## Troubleshooting
- **"WordPress never responded"** → is Docker Desktop running? `docker ps` should list `nexter-qa-wordpress`.
- **Pro run errors about Free** → Pro needs a Free companion zip in `zips/` (it's a required dependency).
- **Abilities show n/a in Docker** → the docker WP image is older than 7.0 (the Abilities API is WP 7.0); the live lane covers this.
- **Sitemap 404 in a test** → check permalinks; on plain permalinks it's `/?nxt_sitemap=1`, not `/sitemap.xml`.
