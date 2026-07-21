#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# regress-common.sh — shared helpers for the Nexter upgrade-regression engine.
# Sourced by run-regression-agent.sh, run-regression-core.sh, capture-*.sh.
#
# All Docker/WP interaction targets THIS repo's compose stack:
#   services : db (mysql:8.0) · wordpress (nexter-qa-wordpress:8882) · wp-setup (wp-cli) · playwright
#   plugins  : installed from ./zips (mounted /zips) via `wp plugin install /zips/<file> --force`
#   DB       : persists in the wp_data volume → survives a plugin swap = upgrade-in-place
# ─────────────────────────────────────────────────────────────────────────────

# ── pretty logging ───────────────────────────────────────────────────────────
c_reset='\033[0m'; c_blue='\033[1;34m'; c_grn='\033[1;32m'; c_yel='\033[1;33m'; c_red='\033[1;31m'
log()  { echo -e "${c_blue}[regress]${c_reset} $*"; }
ok()   { echo -e "${c_grn}[  ok  ]${c_reset} $*"; }
warn() { echo -e "${c_yel}[ warn ]${c_reset} $*"; }
err()  { echo -e "${c_red}[ FAIL ]${c_reset} $*" >&2; }
stage(){ echo; echo -e "${c_blue}━━━ $* ━━━${c_reset}"; }

# ── env ──────────────────────────────────────────────────────────────────────
NEXTER_WP_CONTAINER="${NEXTER_WP_CONTAINER:-nexter-qa-wordpress}"
NEXTER_WP_URL_HOST="${NEXTER_WP_URL_HOST:-http://localhost:8882}"   # from host
NEXTER_WP_URL_NET="${NEXTER_WP_URL_NET:-http://nexter-qa-wordpress}" # from playwright container
WP_PATH="--path=/var/www/html"
# Windows git-bash: stop MSYS from rewriting /var/www/html and /zips paths.
export MSYS_NO_PATHCONV=1

# Run a wp-cli command inside the wp-setup service (entrypoint is `sh -c`).
# usage: wpc "plugin list --status=active"
wpc() {
  docker compose run --rm -T wp-setup "wp $* $WP_PATH"
}

# Bring the stack up (idempotent) and run the base install once.
boot_stack() {
  stage "Boot stack (db + wordpress)"
  docker compose up -d db wordpress
  log "waiting for WordPress health…"
  local tries=0
  # Fresh WP (pre core-install) 302-redirects to install.php — that still means Apache/PHP
  # is serving. Treat ANY real HTTP response (http_code != 000) as "up"; only a refused/
  # timed-out connection (000) keeps waiting. (Old check used `curl -f .../wp-login.php`
  # which mis-handled the 302 and false-failed even though WP was healthy.)
  until [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$NEXTER_WP_URL_HOST/" 2>/dev/null)" != "000" ]; do
    tries=$((tries+1)); [ "$tries" -gt 60 ] && { err "WordPress never responded on $NEXTER_WP_URL_HOST"; return 1; }
    sleep 3
  done
  ok "WordPress responding at $NEXTER_WP_URL_HOST"
}

# Install/activate a SPECIFIC zip by filename in ./zips (bypasses the wildcard loop).
# usage: install_zip nexter-free-4.6.17.zip
install_zip() {
  local file="$1"
  [ -f "zips/$file" ] || { err "zips/$file not found"; return 1; }
  log "install/activate zips/$file"
  wpc "plugin install /zips/$file --force --activate" | tail -3
}

# Ensure WP core is installed (first boot only). Safe to call repeatedly.
ensure_core() {
  wpc "core is-installed" >/dev/null 2>&1 || docker compose run --rm -T wp-setup \
    "wp core install $WP_PATH --url=$NEXTER_WP_URL_HOST --title='Nexter QA' --admin_user=admin --admin_password=password --admin_email=qa@nexter.test --skip-email" | tail -2
}

# Snapshot every nexter_* option as JSON (used to diff settings survival across upgrade).
# usage: snapshot_options out/baseline-options.json
snapshot_options() {
  local out="$1"; mkdir -p "$(dirname "$out")"
  wpc "option list --search='nexter*' --format=json" > "$out" 2>/dev/null || echo "[]" > "$out"
  log "options snapshot → $out ($(wc -c <"$out") bytes)"
}

# Snapshot the registered WP Abilities (regression: 4.6.15 broke ALL of them).
# usage: snapshot_abilities out/baseline-abilities.json
snapshot_abilities() {
  local out="$1"; mkdir -p "$(dirname "$out")"
  # TODO(engine): WP Abilities API has no stock wp-cli command — add a tiny mu-plugin
  #   or `wp eval` that prints wp_get_abilities() keys as JSON. Placeholder for now.
  wpc "eval 'if(function_exists(\"wp_get_abilities\")){echo json_encode(array_keys(wp_get_abilities()));}else{echo \"[]\";}'" > "$out" 2>/dev/null || echo "[]" > "$out"
  log "abilities snapshot → $out"
}

# Semver-ish sort helper: newest zip matching a glob prefix. usage: newest_zip nexter-free
newest_zip() {
  ls -1 zips/"$1"-*.zip 2>/dev/null | sort -V | tail -1 | xargs -r basename
}
# second-newest (the baseline/old). usage: prev_zip nexter-free
prev_zip() {
  ls -1 zips/"$1"-*.zip 2>/dev/null | sort -V | tail -2 | head -1 | xargs -r basename
}
