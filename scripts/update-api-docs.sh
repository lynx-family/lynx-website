#!/usr/bin/env bash
#
# Regenerate the lynx-stack-derived API reference docs in place, against a
# lynx-stack checkout. Covers two pipelines:
#
#   1. rspeedy/* – Microsoft API Extractor + API Documenter, run inside the
#                  lynx-stack `website/` workspace.
#   2. genui, reactlynx-testing-library, lynx-testing-environment – TypeDoc,
#                  run here in lynx-website (`pnpm run typedoc`), reading the
#                  freshly built lynx-stack packages.
#
# Also syncs the `packageManager` pnpm pin in package.json from lynx-stack.
#
# NOT covered: docs/{en,zh}/api/react (bespoke: custom intro + projectDocuments
# whose sources don't ship) and docs/{en,zh}/api/_meta.json (hand-curated
# sidebar nav). Review the diff and reconcile nav when members are added/removed.
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

# rspeedy-related packages mirrored under docs/api/rspeedy, with the package
# directories that hold their api-extractor config.
RSPEEDY_PKG_DIRS=(
  packages/rspeedy/core
  packages/rspeedy/plugin-react
  packages/rspeedy/plugin-external-bundle
  packages/rspeedy/plugin-qrcode
  packages/rspeedy/lynx-bundle-rslib-config
  packages/webpack/externals-loading-webpack-plugin
)
BUILD_FILTERS=(
  --filter @lynx-js/rspeedy
  --filter @lynx-js/react-rsbuild-plugin
  --filter @lynx-js/external-bundle-rsbuild-plugin
  --filter @lynx-js/qrcode-rsbuild-plugin
  --filter @lynx-js/lynx-bundle-rslib-config
  --filter @lynx-js/externals-loading-webpack-plugin
  --filter @lynx-js/genui
  # Needed for the TypeDoc packages below.
  --filter @lynx-js/react
  --filter @lynx-js/testing-environment
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

generate_api_extractor_docs() {
  local name="$1"
  shift
  local pkg_dirs=("$@")

  echo "::group::Generate $name docs (API Extractor + API Documenter)"
  pushd "$STACK" >/dev/null
  rm -rf website/temp website/docs/en/api website/docs/zh/api
  mkdir -p website/temp
  for dir in "${pkg_dirs[@]}"; do
    (cd "$dir" && "${PNPM_CMD[@]}" run api-extractor)
  done
  (cd website && "${PNPM_CMD[@]}" run docs)
  popd >/dev/null
  echo "::endgroup::"
}

sync_api_extractor_docs() {
  local name="$1"
  local target="$2"
  local preserve_index="$3"

  echo "::group::Sync $name docs into lynx-website"
  for loc in en zh; do
    local gen="$STACK/website/docs/$loc/api"
    local web="$WEBSITE/docs/$loc/api/$target"

    mkdir -p "$web"

    shopt -s nullglob
    for f in "$web"/*.md; do
      local bn
      bn="$(basename "$f")"
      if [ "$preserve_index" = "true" ] && [ "$bn" = "index.md" ]; then
        continue
      fi
      [ -f "$gen/$bn" ] || rm "$f"
    done

    for f in "$gen"/*.md; do
      local bn
      bn="$(basename "$f")"
      if [ "$preserve_index" = "true" ] && [ "$bn" = "index.md" ]; then
        continue
      fi
      cp "$f" "$web/$bn"
    done
    shopt -u nullglob
  done
  echo "::endgroup::"
}

sync_package_manager

echo "::group::Build lynx-stack packages"
pushd "$STACK" >/dev/null
ensure_stack_paths_exist \
  "packages/rspeedy/core" \
  "packages/rspeedy/plugin-react" \
  "packages/rspeedy/plugin-external-bundle" \
  "packages/rspeedy/plugin-qrcode" \
  "packages/rspeedy/lynx-bundle-rslib-config" \
  "packages/webpack/externals-loading-webpack-plugin" \
  "packages/genui"
"${PNPM_CMD[@]}" install --frozen-lockfile
"${PNPM_CMD[@]}" exec turbo run build "${BUILD_FILTERS[@]}"
popd >/dev/null
echo "::endgroup::"

generate_api_extractor_docs "rspeedy" "${RSPEEDY_PKG_DIRS[@]}"
sync_api_extractor_docs "rspeedy" "rspeedy" "true"

echo "::group::Overlay built packages into node_modules for TypeDoc"
# TypeDoc reads node_modules. Overlay the freshly built source so the docs
# reflect main — including the testing-library README the published
# @lynx-js/react omits, @lynx-js/genui source comments, and
# @lynx-js/testing-environment (unpublished).
react_nm="$WEBSITE/node_modules/@lynx-js/react"
genui_nm="$WEBSITE/node_modules/@lynx-js/genui"
te_nm="$WEBSITE/node_modules/@lynx-js/testing-environment"
cp -R "$STACK/packages/react/types/." "$react_nm/types/"
cp -R "$STACK/packages/react/testing-library/." "$react_nm/testing-library/"
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
cp -R "$STACK/packages/testing-library/testing-environment/dist/." "$te_nm/dist/"
cp -f "$STACK/packages/testing-library/testing-environment/README.md" "$te_nm/README.md"
echo "::endgroup::"

echo "::group::Generate TypeDoc docs"
cd "$WEBSITE"
rm -rf docs/en/api/genui docs/zh/api/genui
pnpm run typedoc
echo "::endgroup::"

echo "::group::Apply API reference Lynx Go examples"
node scripts/apply-api-doc-overlays.mjs
echo "::endgroup::"

echo "API docs regenerated. Review the diff and update docs/{en,zh}/api/_meta.json"
echo "if API groups or members were added or removed."
