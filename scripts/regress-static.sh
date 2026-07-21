#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# regress-static.sh — static (no-Docker) lane. Runs the EXISTING check-*.sh suite
# against OLD vs NEW zips: no new PHP fatals, version parity, zip hygiene, readme,
# i18n/pot, header, live-CVE. Fast pre-merge gate; complements the Docker engine.
#
# Usage: bash scripts/regress-static.sh --old zips/nexter-free-4.6.17.zip \
#                                       --new zips/nexter-free-4.7.0.zip
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
source scripts/lib/regress-common.sh 2>/dev/null || true

OLD=""; NEW=""
while [[ "$#" -gt 0 ]]; do case "$1" in
  --old) OLD="$2"; shift ;; --new) NEW="$2"; shift ;;
esac; shift; done
[ -f "$NEW" ] || { echo "usage: $0 --old <old.zip> --new <new.zip>"; exit 1; }

TS="${REGRESS_TS:-$(date +%Y%m%d-%H%M%S)}"; OUT="reports/regress/$TS"; mkdir -p "$OUT"
REPORT="$OUT/static.md"; echo "# Static regression lane — $TS" > "$REPORT"

# Reuse whatever exists in scripts/ — each is optional, so guard with -f.
run_check() { # name script args...
  local name="$1"; local script="$2"; shift 2
  if [ -f "scripts/$script" ]; then
    stage "$name"
    if bash "scripts/$script" "$@" >>"$OUT/static-$name.log" 2>&1; then
      echo "- ✅ $name" >> "$REPORT"; ok "$name"
    else
      echo "- ⚠ $name — see static-$name.log" >> "$REPORT"; warn "$name (see log)"
    fi
  else
    echo "- ⏭ $name (scripts/$script not present)" >> "$REPORT"
  fi
}

run_check zip-hygiene    check-zip-hygiene.sh    "$NEW"
run_check php-compat     check-php-compat.sh     "$NEW"
run_check plugin-header  check-plugin-header.sh  "$NEW"
run_check readme-txt     check-readme-txt.sh     "$NEW"
run_check pot-file       check-pot-file.sh       "$NEW"
run_check translation    check-translation.sh    "$NEW"
run_check live-cve       check-live-cve.sh       "$NEW"
[ -n "$OLD" ] && run_check version-parity check-version-parity.sh --old "$OLD" --new "$NEW"
[ -n "$OLD" ] && run_check compare        compare-versions.sh    --old "$OLD" --new "$NEW"

ok "static lane → $REPORT"
