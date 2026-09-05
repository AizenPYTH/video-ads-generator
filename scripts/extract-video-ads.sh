#!/usr/bin/env bash
#
# Extracts the video ads generator (backend/ + frontend/) into a standalone
# repo. The rest of snowolf - the eBay/Stripe app, its history, its Supabase
# schema - stays behind.
#
#   ./scripts/extract-video-ads.sh ../video-ads-generator
#
# The target may be an existing empty clone or a new directory.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DST="${1:?usage: extract-video-ads.sh <target-directory>}"

mkdir -p "$DST"
DST="$(cd "$DST" && pwd)"

if [ "$SRC" = "$DST" ]; then
  echo "Target must be outside the source repo." >&2
  exit 1
fi

echo "source : $SRC"
echo "target : $DST"

# git ls-files, so build output, node_modules and real .env files can never
# be copied by accident - only what the repo actually tracks.
for app in backend frontend; do
  rm -rf "${DST:?}/$app"
  ( cd "$SRC" && git ls-files "$app" ) | while read -r f; do
    mkdir -p "$DST/$(dirname "$f")"
    cp "$SRC/$f" "$DST/$f"
  done
done

cat > "$DST/package.json" <<'EOF'
{
  "name": "video-ads-generator",
  "version": "1.0.0",
  "private": true,
  "description": "Turn a product URL into a video ad in 9:16, 16:9 and 1:1.",
  "scripts": {
    "setup": "npm --prefix backend install && npm --prefix backend exec -- playwright install chromium && npm --prefix frontend install",
    "dev:backend": "npm --prefix backend run dev",
    "dev:frontend": "npm --prefix frontend run dev",
    "build": "npm --prefix backend run build && npm --prefix frontend run build",
    "test": "npm --prefix backend test",
    "lint": "npm --prefix backend run lint && npm --prefix frontend run lint",
    "typecheck": "npm --prefix backend run typecheck && npm --prefix frontend run typecheck"
  },
  "engines": { "node": ">=20" }
}
EOF

cat > "$DST/.gitignore" <<'EOF'
node_modules
dist
storage
.env
.env.*
!.env.example
*.log
*.tsbuildinfo
.vercel
.DS_Store
EOF

# The standalone repo's README is the guide, with the snowolf-specific
# wording and the `video:` script prefix taken out.
python3 - "$SRC/VIDEO-ADS-GENERATOR.md" "$DST/README.md" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
for a, b in [
    ("npm run video:setup", "npm run setup"),
    ("npm run video:backend", "npm run dev:backend"),
    ("npm run video:frontend", "npm run dev:frontend"),
    ("Two standalone apps that deploy independently of the Next.js `smart-seller`\napp in this repo:",
     "Two apps that deploy independently:"),
    ("Neither is compiled by the root `tsconfig.json`, linted by the root ESLint\nconfig, or picked up by the root Vitest config.\n\n", ""),
    ("> Import as a **separate Vercel project** from the Next.js `smart-seller`\n> app at the repo root. The root `vercel.json` belongs to that app and is\n> untouched.\n\n", ""),
]:
    s = s.replace(a, b)
open(dst, "w", encoding="utf-8").write(s)
PY

if [ ! -d "$DST/.git" ]; then
  git -C "$DST" init -q -b main
fi

echo
echo "Extracted $(find "$DST/backend" "$DST/frontend" -type f | wc -l | tr -d ' ') files."
echo "Next:"
echo "  cd $DST"
echo "  npm run setup && npm test        # optional, proves it stands alone"
echo "  git add -A && git commit -m 'Initial commit: AI video ads generator'"
echo "  git push -u origin main"
