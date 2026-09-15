#!/usr/bin/env bash
#
# Refresh the lynx-stack-derived API reference docs in place, against a
# lynx-stack checkout:
#
#   1. api/config, api/react, api/packages – copied as-is from
#      lynx-stack's docs/content by scripts/sync-lynx-stack-docs.mjs. lynx-stack
#      generates and commits these pages itself. scripts/apply-api-doc-overlays.mjs
#      then adds the Lynx Go examples to the ReactLynx API pages.
#   2. genui – TypeDoc, run here in lynx-website (`pnpm run typedoc`), reading
#      the freshly built lynx-stack package.
#
# Also syncs the `packageManager` pnpm pin in package.json from lynx-stack.
#
# Usage: scripts/update-api-docs.sh <path-to-lynx-stack-checkout>

set -euo pipefail

STACK_ARG="${1:?usage: scripts/update-api-docs.sh <lynx-stack-dir>}"
STACK="$(cd "$STACK_ARG" && pwd)"
WEBSITE="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "${PNPM_BIN:-}" ]; then
  PNPM_CMD=("$PNPM_BIN")
elif command -v corepack >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
elif command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=(pnpm)
else
  echo "error: neither corepack nor pnpm is available in PATH." >&2
  echo "Set PNPM_BIN=/absolute/path/to/pnpm and rerun the script." >&2
  exit 1
fi

BUILD_FILTERS=(
  --filter @lynx-js/genui
)

sync_package_manager() {
  echo "::group::Sync packageManager pin from lynx-stack"
  # Keep lynx-website's pnpm pin aligned with lynx-stack's. This edits
  # package.json only — the current run already installed with the old pin, so
  # the new one takes effect on the next run.
  node -e '
    const fs = require("fs");
    const [stackPkg, webPkg] = process.argv.slice(1);
    const want = JSON.parse(fs.readFileSync(stackPkg, "utf8")).packageManager;
    const raw = fs.readFileSync(webPkg, "utf8");
    const have = JSON.parse(raw).packageManager;
    if (!want) {
      console.log("lynx-stack declares no packageManager; leaving the pin alone.");
      process.exit(0);
    }
    if (!have) {
      console.error("error: lynx-website package.json has no packageManager field to update.");
      process.exit(1);
    }
    if (want === have) {
      console.log(`packageManager already up to date: ${want}`);
      process.exit(0);
    }
    fs.writeFileSync(webPkg, raw.replace(JSON.stringify(have), JSON.stringify(want)));
    console.log(`packageManager: ${have} -> ${want}`);
  ' "$STACK/package.json" "$WEBSITE/package.json"
  echo "::endgroup::"
}

ensure_stack_paths_exist() {
  local missing=0
  local path
  for path in "$@"; do
    if [ ! -e "$STACK/$path" ]; then
      echo "error: expected '$STACK/$path' to exist, but it does not." >&2
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    echo "The lynx-stack checkout may be too old for this script. Please update it and retry." >&2
    exit 1
  fi
}

sync_package_manager

echo "::group::Build lynx-stack packages"
pushd "$STACK" >/dev/null
ensure_stack_paths_exist \
  "docs/content/en" \
  "docs/content/zh" \
  "packages/genui"
"${PNPM_CMD[@]}" install --frozen-lockfile
"${PNPM_CMD[@]}" exec turbo run build "${BUILD_FILTERS[@]}"
popd >/dev/null
echo "::endgroup::"

echo "::group::Sync API reference pages from lynx-stack"
node "$WEBSITE/scripts/sync-lynx-stack-docs.mjs" "$STACK/docs"
node "$WEBSITE/scripts/apply-api-doc-overlays.mjs"
echo "::endgroup::"

echo "::group::Overlay built packages into node_modules for TypeDoc"
# TypeDoc reads node_modules. Overlay the freshly built source so the docs
# reflect main, including the @lynx-js/genui source comments.
genui_nm="$WEBSITE/node_modules/@lynx-js/genui"
mkdir -p "$genui_nm"
cp -f "$STACK/packages/genui/package.json" "$genui_nm/package.json"
cp -f "$STACK/packages/genui/index.ts" "$genui_nm/index.ts"
rm -rf \
  "$genui_nm/dist" \
  "$genui_nm/a2ui/src" \
  "$genui_nm/a2ui/dist" \
  "$genui_nm/a2ui-prompt/src" \
  "$genui_nm/a2ui-prompt/dist" \
  "$genui_nm/a2ui-catalog-extractor/src" \
  "$genui_nm/a2ui-catalog-extractor/dist" \
  "$genui_nm/openui/src" \
  "$genui_nm/openui/dist" \
  "$genui_nm/server/agent"
mkdir -p \
  "$genui_nm/a2ui" \
  "$genui_nm/a2ui-prompt" \
  "$genui_nm/a2ui-catalog-extractor" \
  "$genui_nm/openui" \
  "$genui_nm/server"
cp -R "$STACK/packages/genui/dist" "$genui_nm/dist"
cp -R "$STACK/packages/genui/a2ui/src" "$genui_nm/a2ui/src"
cp -R "$STACK/packages/genui/a2ui/dist" "$genui_nm/a2ui/dist"
cp -R "$STACK/packages/genui/a2ui-prompt/src" "$genui_nm/a2ui-prompt/src"
cp -R "$STACK/packages/genui/a2ui-prompt/dist" "$genui_nm/a2ui-prompt/dist"
cp -R "$STACK/packages/genui/a2ui-catalog-extractor/src" "$genui_nm/a2ui-catalog-extractor/src"
cp -R "$STACK/packages/genui/a2ui-catalog-extractor/dist" "$genui_nm/a2ui-catalog-extractor/dist"
cp -R "$STACK/packages/genui/openui/src" "$genui_nm/openui/src"
cp -R "$STACK/packages/genui/openui/dist" "$genui_nm/openui/dist"
cp -R "$STACK/packages/genui/server/agent" "$genui_nm/server/agent"
echo "::endgroup::"

echo "::group::Generate TypeDoc docs"
cd "$WEBSITE"
rm -rf docs/en/api/genui docs/zh/api/genui
pnpm run typedoc
echo "::endgroup::"

echo "API docs refreshed. Review the diff."
