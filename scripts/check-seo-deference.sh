#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# check-seo-deference.sh — NX-R02 auto-catch (static). Does the SEO module defer
# to an active third-party SEO plugin (Yoast/RankMath/AIOSEO/…) for SCHEMA and
# SITEMAP, the way it already does for title/description/canonical/robots/OG?
# If the schema/sitemap emitters lack the other_seo_plugin_active() guard, they
# double-emit → duplicate JSON-LD / competing sitemaps.
#
# Usage: bash scripts/check-seo-deference.sh zips/nexter-free-4.7.0.zip
# Exit 0 = pass/skip · Exit 3 = NX-R02 reproduced.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
ZIP="${1:-}"
[ -f "$ZIP" ] || { echo "usage: $0 <plugin-zip>"; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
SCHEMA="$(find "$TMP" -name class-seo-schema.php | head -1)"
SITEMAP="$(find "$TMP" -name class-seo-sitemap.php | head -1)"

if [ -z "$SCHEMA" ]; then
  echo "SKIP: no SEO module in $(basename "$ZIP") (pre-4.7.0 build) — nothing to check"
  exit 0
fi

fail=0
if grep -q 'other_seo_plugin_active' "$SCHEMA"; then
  echo "PASS  schema: class-seo-schema.php defers to third-party SEO (other_seo_plugin_active present)"
else
  echo "FAIL  NX-R02 schema: class-seo-schema.php does NOT call other_seo_plugin_active()"
  echo "      → with Yoast/RankMath active, Nexter emits a SECOND JSON-LD @graph (duplicate schema)."
  echo "      Fix: early return in print_schema() when other_seo_plugin_active() is true."
  fail=1
fi

if [ -n "$SITEMAP" ]; then
  if grep -qE 'other_seo_plugin_active|wpseo_sitemap|rank_math/sitemap|aioseo' "$SITEMAP"; then
    echo "PASS  sitemap: class-seo-sitemap.php has third-party sitemap awareness"
  else
    echo "WARN  sitemap: class-seo-sitemap.php has no Yoast/RankMath deference (competing sitemaps; different URLs so lower risk)"
  fi
fi

[ "$fail" = "1" ] && exit 3 || exit 0
