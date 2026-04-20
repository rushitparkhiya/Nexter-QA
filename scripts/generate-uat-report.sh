#!/usr/bin/env bash
# Orbit — UAT HTML Report Generator
# Converts screenshots + videos from a flow test run into a self-contained HTML report
#
# Usage:
#   bash scripts/generate-uat-report.sh
#   bash scripts/generate-uat-report.sh --title "Nexter SEO vs RankMath" --out reports/my-report.html

TITLE="UAT Flow Report"
OUT="reports/uat-report-$(date +%Y%m%d-%H%M%S).html"
SNAP_DIR="reports/screenshots/flows-compare"
VIDEO_DIR="reports/videos"

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --title) TITLE="$2"; shift ;;
    --out)   OUT="$2";   shift ;;
    --snaps) SNAP_DIR="$2"; shift ;;
    --videos) VIDEO_DIR="$2"; shift ;;
  esac
  shift
done

mkdir -p reports

echo "Generating UAT HTML report..."
echo "  Screenshots: $SNAP_DIR"
echo "  Videos:      $VIDEO_DIR"
echo "  Output:      $OUT"

python3 scripts/generate-uat-report.py \
  --title "$TITLE" \
  --out "$OUT" \
  --snaps "$SNAP_DIR" \
  --videos "$VIDEO_DIR"

echo ""
echo "Report: $(pwd)/$OUT ($(du -sh "$OUT" | cut -f1))"
echo "Open:   open $OUT"
