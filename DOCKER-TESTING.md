# 🐳 Nexter-QA — Docker-Based Test Runner

Run all 1,053 Playwright tests inside Docker — no need to install Node, npm, or browsers locally. Uses the official Microsoft Playwright image and the existing WordPress Docker stack.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Docker Network: nexter-net                                      │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   db     │  │  wordpress   │  │  wp-setup    │  │playwright│ │
│  │ (MySQL)  │◄─┤ (port 8882)  │◄─┤  (WP-CLI)    │  │ (Tests)  │ │
│  └──────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
│                       ▲                                          │
│                       │ host-gateway                             │
│                       │                                          │
│  Host: localhost:8882 ┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

The `playwright` container talks to WordPress through `localhost:8882` (mapped to the host machine, then back into the wordpress container). This way the same auth cookies, redirects, and URLs work whether you run from your browser or from the test container.

---

## Quick Start

### One-line run (recommended)

**Linux / macOS / Git Bash:**
```bash
bash scripts/docker-run-tests.sh
```

**Windows PowerShell:**
```powershell
pwsh scripts/docker-run-tests.ps1
```

This will:
1. Start the WordPress + MySQL containers
2. Install the Nexter Extension plugin from `zips/`
3. Build the Playwright runner image
4. Run all 1,053 SEO tests
5. Save HTML report + screenshots to `reports/`

### Or use the npm scripts

```bash
# Run everything end-to-end
npm run docker:run

# Or step by step:
npm run docker:up          # bring up WordPress
npm run docker:setup       # install plugin
npm run docker:test        # run all SEO tests
npm run docker:down        # tear down
```

---

## Running Subsets

```bash
# Specific feature group
bash scripts/docker-run-tests.sh --suite seo:dashboard
bash scripts/docker-run-tests.sh --suite seo:meta
bash scripts/docker-run-tests.sh --suite seo:404
bash scripts/docker-run-tests.sh --suite seo:workflow
bash scripts/docker-run-tests.sh --suite seo:scenarios

# Different browser
bash scripts/docker-run-tests.sh --browser firefox
bash scripts/docker-run-tests.sh --browser webkit

# More workers (faster on beefy machines)
bash scripts/docker-run-tests.sh --workers 8

# Fresh start — wipe DB and reinstall
bash scripts/docker-run-tests.sh --fresh

# Run + auto-open report
bash scripts/docker-run-tests.sh --fresh --report
```

---

## All Available `docker:*` npm scripts

| Script | What It Does |
|--------|-------------|
| `npm run docker:up` | Start WordPress + DB containers |
| `npm run docker:setup` | Run wp-setup (install + activate plugin) |
| `npm run docker:down` | Stop & remove containers (keeps volumes) |
| `npm run docker:fresh` | Tear down volumes + restart everything |
| `npm run docker:build` | Build Playwright runner image |
| `npm run docker:test` | Run all SEO tests in chromium |
| `npm run docker:test:dashboard` | Run only dashboard tests |
| `npm run docker:test:workflow` | Run only multi-page workflow tests |
| `npm run docker:test:firefox` | Run all SEO tests in Firefox |
| `npm run docker:test:webkit` | Run all SEO tests in WebKit (Safari engine) |
| `npm run docker:logs` | Tail wordpress container logs |
| `npm run docker:shell` | Open interactive shell inside Playwright runner |
| `npm run docker:run` | Use the full orchestration script |
| `npm run docker:run:fresh` | Fresh DB + run all + open report |

---

## Cross-Browser Testing

Run the same tests across all 3 engines:

```bash
bash scripts/docker-run-tests.sh --browser chromium     # Chrome/Edge
bash scripts/docker-run-tests.sh --browser firefox      # Firefox
bash scripts/docker-run-tests.sh --browser webkit       # Safari
```

The Playwright base image already includes all 3 browsers.

---

## Working with Reports

After any run, reports are written to your local `reports/` folder (volume-mounted):

| File | Purpose |
|------|---------|
| `reports/playwright-html/index.html` | Interactive HTML report |
| `reports/playwright-results.json` | JSON result data (gauntlet-friendly) |
| `reports/screenshots/*.png` | All screenshots from spec files |
| `reports/videos/` | Video recordings (failures only) |

Open the HTML report:
```bash
npx playwright show-report reports/playwright-html
# or just
npm run seo:report
```

---

## Debugging

### Step into the container

```bash
npm run docker:shell
# Inside the container:
ls
npm test
npx playwright test tests/playwright/flows/nexter-seo/seo-dashboard.spec.js
```

### Watch WordPress logs

```bash
npm run docker:logs
```

### Connect to MySQL

```bash
docker compose exec db mysql -uwordpress -pwordpress wordpress
```

### Check container health

```bash
docker compose ps
docker inspect nexter-qa-wordpress --format='{{.State.Health.Status}}'
```

---

## CI / GitHub Actions

The Docker setup is CI-ready. Example workflow:

```yaml
name: Nexter SEO Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run full SEO suite in Docker
        run: bash scripts/docker-run-tests.sh
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: reports/
```

---

## Cleanup

```bash
# Stop containers but keep volumes
docker compose down

# Stop + nuke ALL data (DB, WP files, browser cache)
docker compose down -v

# Remove only the playwright image
docker rmi nexter-qa-playwright
```

---

## Troubleshooting

**"WordPress not healthy" after waiting:**
```bash
docker compose logs wordpress
```

**"localhost:8882 connection refused" inside the container:**
- Verify `extra_hosts: ["localhost:host-gateway"]` is in `docker-compose.yml`
- On older Linux Docker, you may need `--add-host=host.docker.internal:host-gateway`

**Tests pass locally but fail in Docker:**
- Make sure `auth.setup.js` is using `WP_TEST_URL` env var, not hard-coded
- Run `bash scripts/docker-run-tests.sh --fresh` to nuke stale auth cookies

**"npm install" inside the container is slow:**
- The image pre-installs all deps at build time
- If you only changed test files, you don't need to rebuild — they're volume-mounted

---

## Performance Tips

- **Workers:** 4 is the default. On a 16-core machine, try `--workers 8` or `12`.
- **Browsers:** Chromium is fastest. Firefox is ~30% slower. WebKit is similar.
- **First run:** `docker:build` takes 2-3 min (pulls 1GB image). Subsequent runs are instant.
- **Volume cache:** `playwright_node_modules` and `playwright_cache` volumes persist across runs.

---

*Generated as part of the Orbit QA framework — adapted for Nexter Extension SEO module.*
