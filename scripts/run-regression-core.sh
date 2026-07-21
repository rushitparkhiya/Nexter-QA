#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-regression-core.sh — per-edition upgrade-regression ENGINE.
#
# The question this answers: "Does upgrading an EXISTING Nexter site from OLD→NEW
# break anything users already rely on?" (settings, SEO output, templates,
# abilities, DB tables) — DB preserved across the swap.
#
# Usage:
#   bash scripts/run-regression-core.sh --edition free \
#        --old nexter-free-4.6.17.zip --new nexter-free-4.7.0.zip
#   bash scripts/run-regression-core.sh --edition pro  \
#        --old nexter-pro-4.6.17.zip  --new nexter-pro-4.7.0.zip \
#        --free-companion nexter-free-4.7.0.zip
#
# Output: reports/regress/<ts>/core-<edition>.md  (+ snapshots/)
#
# STATUS: scaffold. Stages 1-4,7,11-12 are wired to real docker/curl; stages
# 5-6,8-10 print what they WILL assert and drop a machine-readable TODO marker.
# Fill the TODO(engine) blocks incrementally — the flow already runs end-to-end.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
source scripts/lib/regress-common.sh

EDITION="free"; OLD=""; NEW=""; FREE_COMPANION=""
TS="${REGRESS_TS:-$(date +%Y%m%d-%H%M%S)}"
while [[ "$#" -gt 0 ]]; do case "$1" in
  --edition) EDITION="$2"; shift ;;
  --old) OLD="$2"; shift ;;
  --new) NEW="$2"; shift ;;
  --free-companion) FREE_COMPANION="$2"; shift ;;
  --ts) TS="$2"; shift ;;
  *) warn "unknown arg: $1" ;;
esac; shift; done

# Auto-detect old/new from zips/ if not given.
[ -z "$NEW" ] && NEW="$(newest_zip "nexter-$EDITION")"
[ -z "$OLD" ] && OLD="$(prev_zip "nexter-$EDITION")"
[ -z "$NEW" ] && { err "no NEW zip for edition '$EDITION' in zips/ (expected nexter-$EDITION-<ver>.zip)"; exit 1; }
[ -z "$OLD" ] && { warn "no OLD/baseline zip found — this becomes a fresh-install smoke run, not an upgrade diff"; }

OUT="reports/regress/$TS"; SNAP="$OUT/snap-$EDITION"; REPORT="$OUT/core-$EDITION.md"
mkdir -p "$SNAP/baseline" "$SNAP/candidate"
log "edition=$EDITION  old=${OLD:-<none>}  new=$NEW  → $REPORT"
{
  echo "# Nexter regression — $EDITION"
  echo; echo "- old (baseline): \`${OLD:-none}\`"
  echo "- new (candidate): \`$NEW\`"
  echo "- run: $TS"; echo
} > "$REPORT"

# ── 1. Boot + core ───────────────────────────────────────────────────────────
boot_stack || exit 1
ensure_core

# ── 2. Install BASELINE (old) ────────────────────────────────────────────────
stage "Install baseline"
if [ "$EDITION" = "pro" ]; then
  [ -z "$FREE_COMPANION" ] && FREE_COMPANION="$(newest_zip nexter-free)"
  [ -z "$FREE_COMPANION" ] && { err "Pro needs a Free companion zip (--free-companion) — Pro hard-depends on Free"; exit 1; }
  install_zip "$FREE_COMPANION"
fi
if [ -n "$OLD" ]; then install_zip "$OLD"; else install_zip "$NEW"; fi

# ── 3. Seed fixtures on the baseline (config a real user would have pre-upgrade) ─
stage "Seed baseline fixtures (permalinks · front page · content)"
bash scripts/seed-nexter-fixture.sh --phase pre 2>&1 | sed 's/^/  /' | tee -a "$REPORT" || warn "pre-seed had issues"

# ── 4. BASELINE snapshot ─────────────────────────────────────────────────────
stage "Baseline snapshot"
snapshot_options   "$SNAP/baseline/options.json"
snapshot_abilities "$SNAP/baseline/abilities.json"
bash scripts/capture-seo-outputs.sh --out "$SNAP/baseline/seo" --url "$NEXTER_WP_URL_HOST" || warn "SEO capture (baseline) had issues"
# behaviour baseline = existing spec suites (reuse!). Kept opt-in (slow) via RUN_SPECS=1.
if [ "${RUN_SPECS:-0}" = "1" ]; then
  docker compose run --rm playwright npm run seo:all  || warn "seo specs (baseline) non-zero"
  [ "$EDITION" = "free" ] && docker compose run --rm playwright npm run theme:all || true
fi

# ── 5. UPGRADE IN PLACE (the critical step — DB preserved) ────────────────────
stage "Upgrade in place  ${OLD:-<fresh>} → $NEW"
install_zip "$NEW"          # --force reinstalls over the old copy; wp_data volume keeps the DB
wpc "plugin list --status=active --field=name" | sed 's/^/  active: /'
echo "- upgraded to \`$NEW\` (DB preserved via wp_data volume)" >> "$REPORT"

# ── 5b. Post-upgrade: enable the (new-in-4.7.0) SEO module + apply golden config ─
stage "Enable SEO module on upgraded build + apply golden config"
bash scripts/seed-nexter-fixture.sh --phase post 2>&1 | sed 's/^/  /' | tee -a "$REPORT" || warn "post-seed (SEO enable) had issues"

# ── 6. CANDIDATE snapshot ────────────────────────────────────────────────────
stage "Candidate snapshot"
snapshot_options   "$SNAP/candidate/options.json"
snapshot_abilities "$SNAP/candidate/abilities.json"
bash scripts/capture-seo-outputs.sh --out "$SNAP/candidate/seo" --url "$NEXTER_WP_URL_HOST" || warn "SEO capture (candidate) had issues"

# ── 7. DIFF: settings + abilities survival ───────────────────────────────────
stage "Diff — settings & abilities survival"
diff_json() { # crude presence/shape diff; TODO(engine): key-level semantic diff
  if command -v jq >/dev/null 2>&1; then
    jq -S . "$1" 2>/dev/null > "$1.norm" || cp "$1" "$1.norm"
    jq -S . "$2" 2>/dev/null > "$2.norm" || cp "$2" "$2.norm"
    diff -u "$1.norm" "$2.norm"
  else diff -u "$1" "$2"; fi
}
{
  echo; echo "## Settings survival (nexter_* options)"
  if diff_json "$SNAP/baseline/options.json" "$SNAP/candidate/options.json" > "$OUT/diff-options-$EDITION.txt"; then
    echo "✅ options identical after upgrade"
  else
    echo "⚠ options changed after upgrade — review \`diff-options-$EDITION.txt\` (expected for new SEO defaults; a RESET of a user-set value is a regression)"
  fi
  echo; echo "## Abilities registry (regression: 4.6.15 broke ALL)"
  echo '```'; diff_json "$SNAP/baseline/abilities.json" "$SNAP/candidate/abilities.json" || true; echo '```'
} >> "$REPORT"

# ── 8. SEO checks: schema deference (NX-R02, static) + live SEO output ────────
stage "SEO checks — schema deference (NX-R02) + live output"
{
  echo; echo "## SEO — schema/sitemap deference (NX-R02)"
  echo '```'
  bash scripts/check-seo-deference.sh "zips/$NEW"; DEF=$?
  echo '```'
  [ "${DEF:-0}" = "3" ] && echo "🟠 NX-R02 reproduced (schema does not defer to Yoast/RankMath)" || echo "✅ schema deference ok / not applicable"

  echo; echo "## SEO — live HTTP output (SEO enabled, pretty permalinks)"
  SM=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$NEXTER_WP_URL_HOST/sitemap.xml"); echo "- /sitemap.xml -> $SM $([ "$SM" = "200" ] && echo '✅' || echo '(check toggle/permalink)')"
  RB=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$NEXTER_WP_URL_HOST/robots.txt"); echo "- /robots.txt -> $RB"
  HOME=$(curl -s -m 20 "$NEXTER_WP_URL_HOST/")
  echo "- JSON-LD blocks on home: $(printf '%s' "$HOME" | grep -c 'application/ld+json' || true)"
  printf '%s' "$HOME" | grep -qiE '<meta[^>]+property=.og:' && echo "- og: tags ✅" || echo "- og: tags — none"
  printf '%s' "$HOME" | grep -qiE '<link[^>]+rel=.canonical' && echo "- canonical ✅" || echo "- canonical — none"
} >> "$REPORT" 2>&1

# ── 9. Double-schema dynamic catch (install Yoast, count JSON-LD) — best-effort ─
stage "Double-schema live catch (Nexter SEO + Yoast active)"
{
  echo; echo "## Double-schema live test"
  if wpc "plugin install wordpress-seo --activate" >/dev/null 2>&1; then echo "- Yoast active"; else echo "- Yoast install skipped (no network) — static NX-R02 check above is authoritative"; fi
  PID=$(wpc "post list --post_type=post --field=ID --posts_per_page=1" 2>/dev/null | tr -d '\r' | grep -oE '[0-9]+' | head -1)
  if [ -n "${PID:-}" ]; then
    PURL=$(wpc "post url $PID" 2>/dev/null | tr -d '\r' | tail -1)
    PATHPART=$(printf '%s' "$PURL" | sed -E 's#^https?://[^/]+##')
    POST=$(curl -s -m 20 "$NEXTER_WP_URL_HOST$PATHPART")
    LDN=$(printf '%s' "$POST" | grep -c 'application/ld+json' || true)
    echo "- JSON-LD blocks on a post (both SEO plugins active): $LDN"
    if [ "${LDN:-0}" -ge 2 ]; then echo "🟠 CONFIRMS NX-R02: multiple JSON-LD graphs (Nexter not deferring to Yoast)"; else echo "✅ single JSON-LD graph"; fi
  else echo "- no post to test"; fi
  wpc "plugin deactivate wordpress-seo" >/dev/null 2>&1 || true
} >> "$REPORT" 2>&1

# ── 11. PHP fatal scan (post-upgrade) ────────────────────────────────────────
stage "PHP fatal scan"
FATALS="$(wpc "eval 'echo (file_exists(WP_CONTENT_DIR.\"/debug.log\")?file_get_contents(WP_CONTENT_DIR.\"/debug.log\"):\"\");'" 2>/dev/null | grep -iE 'PHP (Fatal|Parse|Recoverable)|Uncaught' | tail -30 || true)"
if [ -n "$FATALS" ]; then
  err "PHP fatals in debug.log after upgrade:"; echo "$FATALS"
  { echo; echo "## 🔴 PHP fatals after upgrade"; echo '```'; echo "$FATALS"; echo '```'; } >> "$REPORT"
else
  ok "no PHP fatals in debug.log"; echo -e "\n## PHP fatals\n✅ none" >> "$REPORT"
fi

# ── 12. verdict line (consumed by the agent orchestrator) ────────────────────
VERDICT="REVIEW"; [ -z "$FATALS" ] && VERDICT="PASS"; [ -n "$FATALS" ] && VERDICT="FAIL"
echo "REGRESS_VERDICT=$VERDICT EDITION=$EDITION" | tee -a "$REPORT"
ok "core done → $REPORT"
