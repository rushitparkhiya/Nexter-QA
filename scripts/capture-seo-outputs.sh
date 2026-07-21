#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# capture-seo-outputs.sh — snapshot Nexter SEO's real HTTP output so baseline vs
# candidate can be diffed across an upgrade. This is the Nexter-specific capture
# that replaces TPAE's "render every widget" (Nexter is a toolkit, not widgets).
#
# Captures (raw, for byte/structure diff):
#   home <head> (title, meta desc, og:*, twitter:*, canonical, robots)  → head.html
#   JSON-LD schema blocks                                               → schema.json
#   /sitemap.xml (+ well-formedness)                                    → sitemap.xml
#   /robots.txt                                                         → robots.txt
#   /llms.txt                                                           → llms.txt
#   a seeded redirect's status code                                     → redirects.txt
#
# Usage: bash scripts/capture-seo-outputs.sh --out reports/.../seo --url http://localhost:8882
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
OUT="reports/seo-capture"; URL="http://localhost:8882"
while [[ "$#" -gt 0 ]]; do case "$1" in
  --out) OUT="$2"; shift ;; --url) URL="$2"; shift ;;
esac; shift; done
mkdir -p "$OUT"
say() { echo "  [seo-capture] $*"; }

# 1. <head> of the homepage → isolate the SEO-relevant tags (stable, sortable)
curl -fsS "$URL/" 2>/dev/null | tr '>' '>\n' \
  | grep -iE '<title|<meta[^>]+(name="description"|property="og:|name="twitter:|name="robots")|<link[^>]+rel="canonical"' \
  | sed 's/^[[:space:]]*//' | sort > "$OUT/head.html" || say "home fetch failed"
say "head tags: $(wc -l < "$OUT/head.html" 2>/dev/null || echo 0)"

# 2. JSON-LD schema blocks
curl -fsS "$URL/" 2>/dev/null \
  | grep -oE '<script[^>]+application/ld\+json[^>]*>.*</script>' \
  | sed -E 's/<[^>]+>//g' > "$OUT/schema.json" || true
say "schema bytes: $(wc -c < "$OUT/schema.json" 2>/dev/null || echo 0)"

# 3. sitemap + well-formedness
curl -fsS "$URL/sitemap.xml" -o "$OUT/sitemap.xml" 2>/dev/null || say "no /sitemap.xml"
if [ -s "$OUT/sitemap.xml" ]; then
  if command -v xmllint >/dev/null 2>&1; then
    xmllint --noout "$OUT/sitemap.xml" 2>"$OUT/sitemap.wellformed.txt" \
      && echo "well-formed" > "$OUT/sitemap.wellformed.txt" || say "sitemap NOT well-formed"
  fi
fi

# 4. robots.txt + llms.txt
curl -fsS "$URL/robots.txt" -o "$OUT/robots.txt" 2>/dev/null || true
curl -fsS "$URL/llms.txt"   -o "$OUT/llms.txt"   2>/dev/null || true

# 5. redirect status codes (seed a known redirect in the fixture; assert it survives)
# TODO(engine): read redirect sources from fixtures/regression-seed.json instead of this sample.
{
  for path in "/old-url" "/moved-page"; do
    code="$(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' "$URL$path" 2>/dev/null)"
    echo "$path : $code"
  done
} > "$OUT/redirects.txt"

echo "  [seo-capture] done → $OUT"
