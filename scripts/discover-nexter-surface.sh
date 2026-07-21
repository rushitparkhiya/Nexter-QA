#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# discover-nexter-surface.sh — enumerate a Nexter zip's test surface (modules,
# abilities, CPT, SEO features, eval() sites, version) into config JSON so the
# engine + fixtures reflect the ACTUAL build, not a hand-maintained list.
#
# Usage: bash scripts/discover-nexter-surface.sh --zip zips/nexter-free-4.7.0.zip \
#          [--out config/nexter-modules.discovered.json]
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
source scripts/lib/regress-common.sh 2>/dev/null || true

ZIP=""; OUT="config/nexter-modules.discovered.json"
while [[ "$#" -gt 0 ]]; do case "$1" in
  --zip) ZIP="$2"; shift ;; --out) OUT="$2"; shift ;;
esac; shift; done
[ -f "$ZIP" ] || { echo "usage: $0 --zip <path> [--out <json>]"; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
ROOT="$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -1)"

VER="$(grep -rhoiE 'Version:[[:space:]]*[0-9][0-9.]+' "$ROOT"/nexter-*.php 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)+' | head -1)"
CPT="$(grep -ahoE "NEXTER_EXT_CPT', '[a-z_]+'" "$ROOT"/*.php | grep -oE "'[a-z_]+'" | tail -1 | tr -d "'")"

# module toggles = files under panel-settings/extensions + includes/settings-options
mods="$(find "$ROOT" -type f -name 'nexter-ext-*.php' -o -name 'nexter-*.php' 2>/dev/null \
        | grep -E 'settings-options|panel-settings/extensions' \
        | xargs -r -n1 basename | sed 's/\.php$//' | sort -u)"
# abilities = files under include/abilities/
abils="$(find "$ROOT" -path '*abilities*' -name '*.php' -printf '%f\n' 2>/dev/null | sed 's/\.php$//' | sort -u)"
# eval() sites (security watch)
evals="$(grep -rlE '\beval\(' "$ROOT" --include='*.php' 2>/dev/null | xargs -r -n1 basename | sort -u)"
# has the new SEO module?
seo="no"; [ -d "$ROOT/content-seo" ] && seo="yes"

count() { printf '%s' "$1" | grep -c . ; }
log "version=$VER cpt=${CPT:-n/a} seo=$seo modules=$(count "$mods") abilities=$(count "$abils") eval_sites=$(count "$evals")"

# emit JSON
{
  echo "{"
  echo "  \"zip\": \"$(basename "$ZIP")\","
  echo "  \"version\": \"$VER\","
  echo "  \"cpt\": \"${CPT:-}\","
  echo "  \"has_seo_module\": \"$seo\","
  json_arr() { echo "  \"$1\": ["; printf '%s\n' "$2" | sed '/^$/d' | sed 's/.*/    "&",/' | sed '$ s/,$//'; echo "  ]${3-,}"; }
  json_arr "modules"      "$mods"  ","
  json_arr "abilities"    "$abils" ","
  json_arr "eval_sites"   "$evals" ""
  echo "}"
} > "$OUT"
ok "discovery → $OUT"
