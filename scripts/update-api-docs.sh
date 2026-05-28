#!/usr/bin/env bash
#
# Regenerate the lynx-stack-derived API reference docs in place, against a
# lynx-stack checkout. Covers two pipelines:
#
#   1. rspeedy/*           – Microsoft API Extractor + API Documenter, run
#                            inside the lynx-stack `website/` workspace.
#   2. reactlynx-testing-library, lynx-testing-environment – TypeDoc, run here
#                            in lynx-website (`pnpm run typedoc`), reading the
#                            freshly built lynx-stack packages.
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
  # Needed for the TypeDoc packages below.
  --filter @lynx-js/react
  --filter @lynx-js/testing-environment
)

echo "::group::Build lynx-stack packages"
pushd "$STACK" >/dev/null
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm exec turbo run build "${BUILD_FILTERS[@]}"
popd >/dev/null
echo "::endgroup::"

echo "::group::Generate rspeedy docs (API Extractor + API Documenter)"
pushd "$STACK" >/dev/null
rm -rf website/temp && mkdir -p website/temp
for dir in "${RSPEEDY_PKG_DIRS[@]}"; do
  (cd "$dir" && corepack pnpm run api-extractor)
done
(cd website && rm -rf docs/en/api docs/zh/api && corepack pnpm run docs)
popd >/dev/null
echo "::endgroup::"

echo "::group::Sync rspeedy docs into lynx-website (preserving custom index.md)"
for loc in en zh; do
  gen="$STACK/website/docs/$loc/api"
  web="$WEBSITE/docs/$loc/api/rspeedy"
  # Drop docs whose API member no longer exists.
  for f in "$web"/*.md; do
    bn="$(basename "$f")"
    [ "$bn" = "index.md" ] && continue
    [ -f "$gen/$bn" ] || rm "$f"
  done
  # Copy current docs (index.md is the hand-written overview, leave it).
  for f in "$gen"/*.md; do
    bn="$(basename "$f")"
    [ "$bn" = "index.md" ] && continue
    cp "$f" "$web/$bn"
  done
done
echo "::endgroup::"

echo "::group::Overlay built packages into node_modules for TypeDoc"
# TypeDoc reads node_modules. Overlay the freshly built source so the docs
# reflect main — including the testing-library README the published
# @lynx-js/react omits, and @lynx-js/testing-environment (unpublished).
react_nm="$WEBSITE/node_modules/@lynx-js/react"
te_nm="$WEBSITE/node_modules/@lynx-js/testing-environment"
cp -R "$STACK/packages/react/types/." "$react_nm/types/"
cp -R "$STACK/packages/react/testing-library/." "$react_nm/testing-library/"
cp -R "$STACK/packages/testing-library/testing-environment/dist/." "$te_nm/dist/"
cp -f "$STACK/packages/testing-library/testing-environment/README.md" "$te_nm/README.md"
echo "::endgroup::"

echo "::group::Generate TypeDoc docs"
cd "$WEBSITE"
pnpm run typedoc
echo "::endgroup::"

echo "API docs regenerated. Review the diff and update docs/{en,zh}/api/_meta.json"
echo "if API members were added or removed."
