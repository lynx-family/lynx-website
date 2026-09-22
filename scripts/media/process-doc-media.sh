#!/bin/sh
# Convert GIF -> WebM and PNG/JPG/JPEG -> WebP without resizing.
# Run manually after: cd scripts/media (from the repository root).
# Requires macOS or Linux, Python 3.8+,
# FFmpeg 6+ with libvpx-vp9 (and ffprobe), and ImageMagick 7 with WebP support.
# Git is needed only with --scan-references.
# macOS setup: brew install python ffmpeg imagemagick
#
# Replace the illustrative path/to/ values with existing asset paths.
# One file:
#   ./process-doc-media.sh docs/public/assets/path/to/demo.gif
# A directory (recursive):
#   ./process-doc-media.sh --output docs-section docs/public/assets/path/to/docs-section
#
# Usage: ./process-doc-media.sh [OPTIONS] [INPUT ...]
# Relative INPUT and --root paths start at this script's repository root.
# Relative --output paths start at scripts/media/output/, independent of cwd.
# Absolute output paths must stay within that Git-ignored workspace.
#   --output DIR       Task subdirectory, cleared on rerun (including dry runs).
#                      Default: a fresh output/run-* directory; earlier runs are kept.
#   INPUT ...          Files/directories; default: entire root.
#   --root DIR         Input boundary.
#                      Default: this repository's docs/public/assets, independent of cwd.
#   --min-size SIZE    Process files >= SIZE (default: 100KiB). Use 0 for all sizes.
#                      Accepts integer bytes or B/KiB/MiB/GiB, e.g. 512KiB or 1MiB.
#   --dry-run          List candidates and total source size; retain manifests only.
#   --scan-references  Scan Git-tracked docs for filename references (default: off).
#                      Requires Git; inherited GIT_* overrides are ignored.
#   --webp-quality N   WebP quality 1..100 (default: 82); higher means better quality.
#   --webm-crf N       VP9 CRF 0..63 (default: 30); lower means better quality.
#   -h, --help         Show command help.
#
# Results: directory inputs preserve descendants; file inputs use the basename.
# Only extensions change.
# Only smaller, validated conversions are kept. The printed output directory
# contains manifest.md (readable table) and manifest.tsv (spreadsheet data).
# Rerun with the same --output to clean and regenerate only that task directory
# after preflight checks pass. The workspace itself cannot be selected for cleanup.
# Only one helper run may write to the workspace at a time, including dry runs.
# An active run makes another exit with code 2; retry after the active run exits.
# Sources, documentation and allowlist are never edited; upload to CDN manually.
# Exit: 0 completed, 1 per-file failures, 2 setup/argument error, 130 interrupted.
# Implementation: process-doc-media.py. Do not add this helper to CI/lifecycle.
set -eu
exec python3 "$(dirname "$0")/process-doc-media.py" "$@"
