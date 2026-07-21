#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-regression-agent.sh — ORCHESTRATOR. Runs Free AND Pro upgrade regression
# and emits ONE consolidated GO / NO-GO release decision.
#
#   Skill = one edition, one task.   Agent = both editions + decision + verdict.
#
# Usage:
#   npm run regress:agent                         # auto: newest 2 zips per edition
#   npm run regress:agent -- --edition free
#   npm run regress:agent -- --old-free nexter-free-4.6.17.zip --new-free nexter-free-4.7.0.zip
#
# Consolidation rule (worst-of): any edition FAIL → ❌ NO-GO; any REVIEW → ⚠ GO(conditional); else ✅ GO.
# Pre-existing findings are REVIEW, never flip GO→NO-GO unless newly introduced.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
source scripts/lib/regress-common.sh

EDITION="both"
TS="$(date +%Y%m%d-%H%M%S)"; export REGRESS_TS="$TS"
OLD_FREE=""; NEW_FREE=""; OLD_PRO=""; NEW_PRO=""
while [[ "$#" -gt 0 ]]; do case "$1" in
  --edition) EDITION="$2"; shift ;;
  --old-free) OLD_FREE="$2"; shift ;;  --new-free) NEW_FREE="$2"; shift ;;
  --old-pro)  OLD_PRO="$2";  shift ;;  --new-pro)  NEW_PRO="$2";  shift ;;
  *) warn "unknown arg: $1" ;;
esac; shift; done

OUT="reports/regress/$TS"; mkdir -p "$OUT"
VERDICT_FILE="$OUT/AGENT-VERDICT.md"
log "consolidated run $TS → $VERDICT_FILE"

run_edition() {
  local ed="$1"; shift
  stage "EDITION: $ed"
  bash scripts/run-regression-core.sh --edition "$ed" --ts "$TS" "$@"
  grep -h "REGRESS_VERDICT=" "$OUT/core-$ed.md" | tail -1
}

declare -A RESULT
if [ "$EDITION" = "free" ] || [ "$EDITION" = "both" ]; then
  args=(); [ -n "$OLD_FREE" ] && args+=(--old "$OLD_FREE"); [ -n "$NEW_FREE" ] && args+=(--new "$NEW_FREE")
  RESULT[free]="$(run_edition free "${args[@]}" | grep -oE 'REGRESS_VERDICT=[A-Z]+' | cut -d= -f2)"
fi
if [ "$EDITION" = "pro" ] || [ "$EDITION" = "both" ]; then
  if [ -z "$(newest_zip nexter-pro)" ]; then
    warn "no Pro zip in zips/ — skipping Pro"
  else
    args=(); [ -n "$OLD_PRO" ] && args+=(--old "$OLD_PRO"); [ -n "$NEW_PRO" ] && args+=(--new "$NEW_PRO")
    RESULT[pro]="$(run_edition pro "${args[@]}" | grep -oE 'REGRESS_VERDICT=[A-Z]+' | cut -d= -f2)"
  fi
fi

# ── consolidate (worst-of) ───────────────────────────────────────────────────
OVERALL="GO"; ICON="✅"
for ed in "${!RESULT[@]}"; do
  case "${RESULT[$ed]}" in
    FAIL) OVERALL="NO-GO"; ICON="❌" ;;
    REVIEW) [ "$OVERALL" = "GO" ] && { OVERALL="GO (conditional)"; ICON="⚠"; } ;;
  esac
done

{
  echo "# 🤖 Nexter regression — consolidated verdict"
  echo; echo "**$ICON $OVERALL**"; echo; echo "| edition | verdict |"; echo "|---|---|"
  for ed in free pro; do [ -n "${RESULT[$ed]:-}" ] && echo "| $ed | ${RESULT[$ed]} |"; done
  echo; echo "Per-edition detail: \`core-free.md\`, \`core-pro.md\` in this folder."
  echo "Diffs: \`diff-options-*.txt\`, snapshots under \`snap-*/\`."
} > "$VERDICT_FILE"

echo; cat "$VERDICT_FILE"
ok "verdict → $VERDICT_FILE"
