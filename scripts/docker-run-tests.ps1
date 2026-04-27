# Nexter-QA — Docker-based Playwright Test Runner (Windows PowerShell)
#
# Usage:
#   pwsh scripts/docker-run-tests.ps1
#   pwsh scripts/docker-run-tests.ps1 -Suite seo:dashboard
#   pwsh scripts/docker-run-tests.ps1 -Browser firefox
#   pwsh scripts/docker-run-tests.ps1 -Fresh -Report

param(
  [string]$Suite = "seo:all",
  [string]$Browser = "chromium",
  [int]$Workers = 0,
  [switch]$Headed,
  [switch]$Fresh,
  [switch]$Report,
  [switch]$Help
)

function Header($msg) { Write-Host "`n[ $msg ]" -ForegroundColor Cyan }
function Ok($msg)     { Write-Host "OK $msg" -ForegroundColor Green }
function Warn($msg)   { Write-Host "WARN $msg" -ForegroundColor Yellow }
function Fail($msg)   { Write-Host "FAIL $msg" -ForegroundColor Red }

if ($Help) {
  Write-Host @"
Nexter-QA Docker Test Runner (Windows)
======================================

Usage: pwsh scripts/docker-run-tests.ps1 [options]

Options:
  -Suite <name>     npm script name (default: seo:all)
                    e.g., seo:dashboard, seo:meta, seo:404, seo:workflow
  -Browser <name>   chromium | firefox | webkit (default: chromium)
  -Workers <n>      Parallel workers (default: 4)
  -Headed           Run with browser UI visible
  -Fresh            Tear down and rebuild WordPress + plugin from scratch
  -Report           Open HTML report after run

Examples:
  pwsh scripts/docker-run-tests.ps1
  pwsh scripts/docker-run-tests.ps1 -Suite seo:dashboard
  pwsh scripts/docker-run-tests.ps1 -Suite seo:meta -Workers 8
  pwsh scripts/docker-run-tests.ps1 -Browser firefox
  pwsh scripts/docker-run-tests.ps1 -Fresh -Report
"@
  exit 0
}

Header "Nexter-QA Docker Test Runner"
Write-Host "Suite:    $Suite"      -ForegroundColor Yellow
Write-Host "Browser:  $Browser"    -ForegroundColor Yellow
if ($Workers -gt 0) { Write-Host "Workers:  $Workers" -ForegroundColor Yellow }
if ($Headed)        { Write-Host "Mode:     headed"   -ForegroundColor Yellow }
if ($Fresh)         { Write-Host "Fresh:    yes (DB reset)" -ForegroundColor Yellow }

# Step 1: Optional fresh teardown
if ($Fresh) {
  Header "Tearing down existing containers"
  docker compose down -v
  Ok "Volumes removed"
}

# Step 2: Bring up WordPress + DB
Header "Bringing up WordPress (db + wordpress + wp-setup)"
docker compose up -d db wordpress
Ok "DB + WordPress containers started"

Write-Host "Waiting for WordPress to become healthy..."
for ($i = 0; $i -lt 30; $i++) {
  $status = (docker inspect --format='{{.State.Health.Status}}' nexter-qa-wordpress 2>$null)
  if ($status -eq "healthy") {
    Ok "WordPress is healthy"
    break
  }
  Start-Sleep -Seconds 2
  Write-Host "." -NoNewline
}

# Step 3: Run wp-setup
Header "Running WP setup (core install + plugin activation)"
docker compose run --rm wp-setup
if ($LASTEXITCODE -ne 0) { Warn "wp-setup completed with warnings" }

# Step 4: Build playwright image
Header "Building Playwright runner image"
docker compose build playwright
Ok "Playwright runner ready"

# Step 5: Run the test suite
Header "Running test suite: $Suite on $Browser"

$envFlags = @()
if ($Workers -gt 0) { $envFlags += "-e"; $envFlags += "PLAYWRIGHT_WORKERS=$Workers" }

$npmCmd = "npm run $Suite"
if ($Browser -ne "chromium") {
  $headedFlag = if ($Headed) { "--headed" } else { "" }
  $npmCmd = "npx playwright test tests/playwright/flows/nexter-seo/ --config=tests/playwright/playwright.config.js --project=$Browser $headedFlag"
}

docker compose run --rm @envFlags playwright sh -c "$npmCmd"
$ExitCode = $LASTEXITCODE

# Step 6: Summary
Header "Test Run Complete"
if ($ExitCode -eq 0) {
  Ok "All tests passed"
} else {
  Warn "Some tests failed (exit code $ExitCode)"
}

Write-Host ""
Write-Host "Reports:"
Write-Host "  HTML:      reports/playwright-html/index.html"
Write-Host "  JSON:      reports/playwright-results.json"
Write-Host "  Snapshots: reports/screenshots/"

# Step 7: Open report
if ($Report) {
  Header "Opening HTML report"
  Start-Process "reports/playwright-html/index.html"
}

exit $ExitCode
