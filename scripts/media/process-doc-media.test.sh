#!/bin/sh
# Stable shell entry point for local integration tests.
set -eu
exec python3 "$(dirname "$0")/process-doc-media.test.py" "$@"
