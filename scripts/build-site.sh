#!/usr/bin/env bash
# Collects only the files the website needs into _site/ (no tests, tooling or docs).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site/vendor
cp index.html app.js app.css theme.js manifest.webmanifest icon.svg icon-192.png icon-512.png apple-touch-icon.png _headers _site/
cp vendor/*.mjs _site/vendor/
echo "Built _site/ with $(find _site -type f | wc -l | tr -d ' ') files"
