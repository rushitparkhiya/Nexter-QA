#!/usr/bin/env bash
# Nexter-QA — Docker-based Playwright Test Runner (Orbit-style)
#
# Usage:
#   bash scripts/docker-run-tests.sh                          # run full SEO suite
#   bash scripts/docker-run-tests.sh --suite seo:dashboard    # run one group
#   bash scripts/docker-run-tests.sh --browser firefox        # different browser
#   bash scripts/docker-run-tests.sh --workers 8              # parallelism
#   bash scripts/docker-run-tests.sh --headed                 # show browser
#   bash scripts/docker-run-tests.sh --fresh                  # rebuild WP from scratch
#   bash scripts/docker-run-tests.sh --report                 # open HTML report after

set -e
[ -z "$TERM" ] && export TERM=xterm-256color

SUITE="seo:all"
BROWSER="chromium"
WORKERS=""
HEADED=""
FRESH=""
OPEN_REPORT=""

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()   { echo -e "${RED}✗ $1${NC}"; }
header() { echo -e "\n${BOLD}${CYAN}[ $1 ]${NC}"; }

# Parse args
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --suite)    SUITE="$2"; shift ;;
    --browser)  BROWSER="$2"; shift ;;
    --workers)  WORKERS="$2"; shift ;;
    --headed)   HEADED="--headed" ;;
    --fresh)    FRESH="1" ;;
    --report)   OPEN_REPORT="1" ;;
    -h|--help)
      cat <<EOF
Nexter-QA Docker Test Runner — Orbit Style
==========================================

Usage: $0 [options]

Options:
  --suite <name>      npm script name (default: seo:all)
                      e.g., seo:dashboard, seo:meta, seo:404, seo:workflow
  --browser <name>    chromium | firefox | webkit (default: chromium)
  --workers <n>       Parallel workers (default: 4)
  --headed            Run with browser UI visible
  --fresh             Tear down and rebuild WordPress + plugin from scratch
  --report            Open HTML report after run

Examples:
  $0                                       # run all 1053 SEO tests
  $0 --suite seo:dashboard                 # only dashboard suite
  $0 --suite seo:meta --workers 8          # meta tests, 8 workers
  $0 --browser firefox                     # all SEO tests in Firefox
  $0 --fresh --report                      # fresh DB, run all, open report

EOF
      exit 0
      ;;
  esac
  shift
done

header "Nexter-QA Docker Test Runner"
echo -e "Suite:    ${YELLOW}$SUITE${NC}"
echo -e "Browser:  ${YELLOW}$BROWSER${NC}"
echo -e "Workers:  ${YELLOW}${WORKERS:-default}${NC}"
[ -n "$HEADED" ] && echo -e "Mode:     ${YELLOW}headed${NC}"
[ -n "$FRESH" ]  && echo -e "Fresh:    ${YELLOW}yes (DB reset)${NC}"

# Step 1: Optionally tear down for fresh run
if [ -n "$FRESH" ]; then
  header "Tearing down existing containers"
  docker compose down -v || true
  ok "Volumes removed"
fi

# Step 2: Bring up WordPress + DB + WP-CLI installer
header "Bringing up WordPress (db + wordpress + wp-setup)"
docker compose up -d db wordpress
ok "DB + WordPress containers started"

echo "Waiting for WordPress to become healthy..."
for i in {1..30}; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' nexter-qa-wordpress 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then
    ok "WordPress is healthy"
    break
  fi
  sleep 2
  echo -n "."
done

# Step 3: Run wp-setup (installs core + plugins from /zips)
header "Running WP setup (core install + plugin activation)"
docker compose run --rm wp-setup || warn "wp-setup completed with warnings (may already be set up)"

# Step 4: Build the playwright runner image (if not built or stale)
header "Building Playwright runner image (cached if no changes)"
docker compose build playwright
ok "Playwright runner ready"

# Step 5: Run the test suite
header "Running test suite: $SUITE on $BROWSER"

# Build the npm command
NPM_CMD="npm run $SUITE"

# Override env vars
ENV_FLAGS=""
[ -n "$WORKERS" ]  && ENV_FLAGS="$ENV_FLAGS -e PLAYWRIGHT_WORKERS=$WORKERS"

# If user wants a different browser project, swap the script
case "$BROWSER" in
  firefox|webkit)
    # Replace --project=chromium with the requested browser
    NPM_CMD="npx playwright test tests/playwright/flows/nexter-seo/ --config=tests/playwright/playwright.config.js --project=$BROWSER $HEADED"
    ;;
esac

# Headed mode tweak
if [ -n "$HEADED" ]; then
  NPM_CMD="$NPM_CMD -- $HEADED"
fi

set +e
docker compose run --rm $ENV_FLAGS playwright sh -c "$NPM_CMD"
EXIT_CODE=$?
set -e

# Step 6: Print summary
header "Test Run Complete"
if [ "$EXIT_CODE" -eq 0 ]; then
  ok "All tests passed"
else
  warn "Some tests failed (exit code $EXIT_CODE)"
fi

echo ""
echo "Reports:"
echo "  HTML:      reports/playwright-html/index.html"
echo "  JSON:      reports/playwright-results.json"
echo "  Snapshots: reports/screenshots/"

# Step 7: Optionally open the HTML report
if [ -n "$OPEN_REPORT" ]; then
  header "Opening HTML report"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open reports/playwright-html/index.html
  elif command -v open >/dev/null 2>&1; then
    open reports/playwright-html/index.html
  elif command -v start >/dev/null 2>&1; then
    start reports/playwright-html/index.html
  else
    echo "Open reports/playwright-html/index.html manually."
  fi
fi

exit $EXIT_CODE
