#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# seed-nexter-fixture.sh — put REAL config on the docker WP so the upgrade diff
# is meaningful (not a bare install). Two phases:
#   --phase pre   (on the OLD baseline): pretty permalinks + front page + post/page
#                 + site identity. (SEO module does not exist pre-4.7.0.)
#   --phase post  (after upgrade to 4.7.0+): enable the SEO module and apply the
#                 golden SEO config (fixtures/golden-seo-4.7.0.json) so sitemap /
#                 schema / meta actually emit and can be asserted.
#
# Runs everything in ONE wp-setup container per phase. JSON is passed base64 to
# dodge all shell-quoting issues.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
source scripts/lib/regress-common.sh 2>/dev/null || true
export MSYS_NO_PATHCONV=1

PHASE="pre"
while [[ "$#" -gt 0 ]]; do case "$1" in --phase) PHASE="$2"; shift ;; esac; shift; done

if [ "$PHASE" = "pre" ]; then
  echo "[seed] phase=pre — permalinks + content + identity"
  docker compose run --rm -T wp-setup 'set -e; P="--path=/var/www/html"
    wp rewrite structure "/%postname%/" $P >/dev/null 2>&1 || true
    wp rewrite flush --hard $P >/dev/null 2>&1 || true
    wp option update blogname "Nexter QA Site" $P >/dev/null
    wp option update blogdescription "Upgrade-regression fixture" $P >/dev/null
    if ! wp post list --post_type=page --pagename=qa-home --field=ID $P 2>/dev/null | grep -q .; then
      HID=$(wp post create --post_type=page --post_title="QA Home" --post_name=qa-home --post_status=publish --porcelain $P)
      wp option update show_on_front page $P >/dev/null
      wp option update page_on_front "$HID" $P >/dev/null
    fi
    wp post list --post_type=post --field=ID $P 2>/dev/null | grep -q . || \
      wp post create --post_title="QA Post One" --post_content="Regression fixture post for SEO and schema output." --post_status=publish $P >/dev/null
    wp post create --post_type=page --post_title="QA Page One" --post_status=publish $P >/dev/null 2>&1 || true
    echo "  [seed pre] done: permalinks=/%postname%/, static front page, 1 post + pages"'
elif [ "$PHASE" = "post" ]; then
  echo "[seed] phase=post — enable SEO module + apply golden config"
  [ -f fixtures/golden-seo-4.7.0.json ] || { echo "  [seed post] golden config missing"; exit 1; }
  B64="$(base64 -w0 fixtures/golden-seo-4.7.0.json 2>/dev/null || base64 fixtures/golden-seo-4.7.0.json | tr -d '\n')"
  docker compose run --rm -T wp-setup "set -e; P=\"--path=/var/www/html\"
    wp option update nexter_extra_ext_options '{\"seo\":{\"switch\":true},\"code-snippets\":{\"values\":{\"migration\":true}}}' --format=json \$P >/dev/null
    echo '$B64' | base64 -d > /tmp/seo.json
    wp option update nexter_content_seo_options \"\$(cat /tmp/seo.json)\" --format=json \$P >/dev/null
    wp rewrite flush --hard \$P >/dev/null 2>&1 || true
    echo \"  [seed post] SEO module enabled + golden config applied (xml_sitemap=on, Article schema, llms=on)\""
else
  echo "usage: $0 --phase pre|post"; exit 1
fi
