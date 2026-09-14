#!/usr/bin/env bash
#
# Copy the API reference pages that lynx-stack owns into this site.
#
# lynx-stack keeps them under docs/content/{en,zh}/ with the same layout as
# docs/{en,zh}/ here and commits the generated sections, so this is a plain
# copy: lynx-stack does not need to be installed or built.
#
# The directories are listed in scripts/lynx-stack-docs-dirs.txt. Change those
# pages in lynx-stack, not here; the next sync overwrites local edits. Links to
# lynxjs.org pages that exist in this site become site-relative on the way in.
#
# Usage: scripts/sync-lynx-stack-docs.sh <path-to-lynx-stack-checkout>

set -euo pipefail

STACK="$(cd "${1:?usage: scripts/sync-lynx-stack-docs.sh <lynx-stack-dir>}" && pwd)"
WEBSITE="$(cd "$(dirname "$0")/.." && pwd)"

while IFS= read -r dir; do
  [ -n "$dir" ] || continue
  for loc in en zh; do
    src="$STACK/docs/content/$loc/$dir"
    dst="$WEBSITE/docs/$loc/$dir"
    if [ ! -d "$src" ]; then
      echo "error: '$src' does not exist. Is '$STACK' a lynx-stack checkout with docs/content?" >&2
      exit 1
    fi
    mkdir -p "$dst"
    rsync -a --delete "$src/" "$dst/"
    # lynx-stack links to pages it does not own with absolute lynxjs.org URLs.
    # Where such a page exists in this site, make the link site-relative.
    python3 - "$WEBSITE/docs" "$dst" <<'PY_EOF'
import os, re, sys
docs, target = sys.argv[1], sys.argv[2]
def exists(path):
    p = re.sub(r'\.html$', '', path.split('#')[0]).rstrip('/')
    if not p.startswith('/zh/'):
        p = '/en' + p
    base = os.path.join(docs, p.lstrip('/'))
    return any(os.path.exists(base + ext) for ext in ('.md', '.mdx', '/index.md', '/index.mdx'))
link = re.compile(r'(\]\(|^\[[^\]]+\]:\s*)https://lynxjs\.org(/[^)\s]*)', re.M)
for root, _, files in os.walk(target):
    for f in files:
        if f.endswith(('.md', '.mdx')):
            path = os.path.join(root, f)
            s = open(path, encoding='utf8').read()
            out = link.sub(lambda m: m.group(1) + m.group(2) if exists(m.group(2)) else m.group(0), s)
            if out != s:
                open(path, 'w', encoding='utf8').write(out)
PY_EOF
    echo "synced $loc/$dir"
  done
done < "$WEBSITE/scripts/lynx-stack-docs-dirs.txt"
