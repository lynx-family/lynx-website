---
name: generate-cdp-spec
description: Generate or check the Lynx DevTool CDP API reference from the authoritative generated manifest using packages/lynx-cdp/generate_cdp_docs.py, with mandatory Chinese translation after English generation. Use when asked to regenerate the CDP spec or refresh generated CDP documentation.
---

# Generate the CDP Spec

Use the existing website generator. The Lynx source repository owns protocol
metadata and custom method documentation; this repository owns the generated
MDX and its presentation.

## Locate the inputs

Run commands from the website repository root. Find the open-source Lynx
checkout from the user's context or nearby checkouts, and verify these inputs:

- `devtool/lynx_devtool/protocol/cdp_manifest.generated.yaml`
- `devtool/lynx_devtool/protocol/custom_cdp_docs/`

Use the requested checkout or revision. If the inputs cannot be found, ask for
the checkout path. Treat the generated manifest as authoritative for the
protocol inventory and metadata, and the accompanying custom docs as the
source for method details. Do not override them with assumptions from existing
website pages, implementation code, or upstream CDP documentation.

If input validation fails or any suspected defect is found in the inputs,
generator, or generated content, stop and prompt the user with the affected
file or method, the evidence, and the decision needed. Wait for the user's
direction before proceeding. Do not edit or regenerate the input manifest,
patch custom docs or the generator, or work around the defect in the output.
Ordinary missing or stale generated pages are expected regeneration work;
they do not by themselves indicate an input or generator defect.

The default output base is `docs/en/api/cdp/api-ref`. Respect an explicitly
requested alternative. `--output-path` must have **no file extension**; it
produces `<base>.mdx`, `<base>/<domain>.mdx`, and `<base>/_meta.json`.

For input schemas, rendering details, or validation failures, read the
[generator guide](../../../packages/lynx-cdp/generate_cdp_docs.md).

## Generate or check

Use Python 3 with PyYAML. Reuse a suitable environment; if needed, create a
virtual environment in the website checkout and install the dependency:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install PyYAML
```

Set `LYNX_ROOT` to the verified checkout path. With that environment, regenerate
the English reference using:

```bash
LYNX_ROOT="/absolute/path/to/lynx"
.venv/bin/python packages/lynx-cdp/generate_cdp_docs.py \
  --write \
  --manifest "$LYNX_ROOT/devtool/lynx_devtool/protocol/cdp_manifest.generated.yaml" \
  --custom-docs "$LYNX_ROOT/devtool/lynx_devtool/protocol/custom_cdp_docs" \
  --output-path docs/en/api/cdp/api-ref
```

For a verification-only request, run the same command with `--check` instead of
`--write`. This computes expected output without writing files and exits
nonzero for missing, invalid, or stale output. After regeneration, run `--check`
with the same inputs and output base to confirm the generated files are current.

## Preserve ownership

- Review existing changes in the output paths before writing. The generator
  replaces the marked MDX blocks, rewrites the domain `_meta.json`, and removes
  generator-owned domain pages absent from the manifest.
- Keep hand-maintained frontmatter, introductions, and website components
  outside the generated block. Preserve these markers:

  ```mdx
  {/* BEGIN GENERATED CDP REFERENCE */}
  {/* END GENERATED CDP REFERENCE */}
  ```

- Do not hand-edit generated English content to make a check pass. Follow the
  stop-and-prompt rule above when a defect is found.
- Custom methods whose summary begins with `Initial documentation entry` are
  counted but omitted from detailed sections by design. Preserve that behavior;
  do not fill in missing details or edit the source placeholders.

## Translate into Chinese

Chinese translation is mandatory after the English output is ready and passes
`--check`. Regeneration is incomplete until both language versions are current.
The generator emits English only; do not run it against Chinese pages.

Translate the English output into `docs/zh/api/cdp/api-ref.mdx` and
`docs/zh/api/cdp/api-ref/`, and synchronize the domain `_meta.json`. For an
alternative English output location, use its corresponding Chinese location.
Carry over added or removed domains and translate the summary, domain pages,
notices, and explanatory text. Preserve protocol identifiers, method names,
types, code examples, link targets, and generated-block markers. Keep existing
hand-maintained content outside the translated blocks.

Check that Chinese pages and navigation cover the same domains and methods as
English, and that the translation faithfully preserves the input's meaning.
If translation exposes a suspected defect or ambiguity in the source, stop and
prompt the user instead of correcting or inventing protocol details.

For a verification-only request, check Chinese coverage and translation
currency as well as English `--check`, and report discrepancies without writing.

## Verify and report

Inspect both language diffs, including added or removed domain pages and
navigation, and run `git diff --check`. If generated docs changed, follow the
repository's downstream verification requirements: run `pnpm run prepare` and
`pnpm run build`, then request downstream validation against the updated OSS
pin. A verification-only run that changes no files needs no site rebuild.

Report the source checkout/revision used, output paths, English generation/check
results, Chinese translation verification, and build results. If a defect
blocked completion, state what was found and what user direction is needed;
do not claim completion while translation or required verification is pending.
