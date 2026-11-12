#!/usr/bin/env bash
# Rebuilds vendor/anthropic-sdk-<version>.mjs from npm with pinned versions.
set -euo pipefail
SDK_VERSION="1.3.0"
ESBUILD_VERSION="0.25.0"
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund "@anthropic-ai/sdk@${SDK_VERSION}" "esbuild@${ESBUILD_VERSION}"
printf "export { default } from '@anthropic-ai/sdk';\nexport * from '@anthropic-ai/sdk';\n" > entry.mjs
./node_modules/.bin/esbuild entry.mjs --bundle --format=esm --platform=browser --minify --legal-comments=inline \
  --outfile="$root/vendor/anthropic-sdk-${SDK_VERSION}.mjs"
shasum -a 256 "$root/vendor/anthropic-sdk-${SDK_VERSION}.mjs"
