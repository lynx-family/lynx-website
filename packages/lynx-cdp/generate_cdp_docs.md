# CDP Docs Generator

`generate_cdp_docs.py` generates the Lynx DevTool CDP API reference for this website.

It reads protocol metadata maintained in the Lynx source repository and writes the
generated portions of the website's MDX pages. It creates a summary page and one
page for each CDP domain. Standard CDP methods link to the upstream Chrome
DevTools Protocol reference. Lynx extensions are rendered from the accompanying
custom documentation.

## Inputs and Ownership

The Lynx source repository is the source of truth for the protocol metadata:

- `devtool/lynx_devtool/protocol/cdp_manifest.generated.yaml`
- `devtool/lynx_devtool/protocol/custom_cdp_docs/`

This website repository owns the generator, the output page, and its presentation.
That includes the script's location, commands, generated MDX structure, page
placement, and website build or CI integration.

## Localization

The generator produces English documentation only. Generate Chinese CDP pages
and their `_meta.json` from the English output through manual maintenance or an
agent workflow.

## Usage

Create a virtual environment from the website repository root, then install the
script dependency:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip PyYAML
```

The `.venv` directory keeps the dependency separate from the system Python. Run
`source .venv/bin/activate` before using the generator in a new shell, and run
`deactivate` when finished.

With the environment active, run the script and provide paths to a Lynx source
checkout. `--output-path` is an extensionless base path; the generator creates
the summary page and a same-named directory for domain pages and its `_meta.json`.

```bash
python packages/lynx-cdp/generate_cdp_docs.py \
  --write \
  --manifest [LYNX_ROOT]/devtool/lynx_devtool/protocol/cdp_manifest.generated.yaml \
  --custom-docs [LYNX_ROOT]/devtool/lynx_devtool/protocol/custom_cdp_docs \
  --output-path docs/en/api/cdp/api-ref
```

Use `--check` in CI or before committing to verify that the generated page is
current:

```bash
python packages/lynx-cdp/generate_cdp_docs.py \
  --check \
  --manifest [LYNX_ROOT]/devtool/lynx_devtool/protocol/cdp_manifest.generated.yaml \
  --custom-docs [LYNX_ROOT]/devtool/lynx_devtool/protocol/custom_cdp_docs \
  --output-path docs/en/api/cdp/api-ref
```

`[LYNX_ROOT]` is the root of an open-source Lynx checkout.

## Modes

`--write`:

- loads and validates the protocol metadata
- creates the summary page, domain pages, and domain `_meta.json` when they do
  not exist
- replaces only the generated block when an output file already exists
- removes generator-owned domain pages that are no longer in the manifest

`--check`:

- generates the expected output in memory
- fails when an output file is missing, lacks generated-block markers, or is stale
- fails when a generator-owned domain page is no longer in the manifest
- prints the update command and a unified diff

## Generated Block

The generator updates only the content between these MDX markers:

```mdx
{/* BEGIN GENERATED CDP REFERENCE */}
{/* END GENERATED CDP REFERENCE */}
```

All content outside the markers is maintained by the website. This includes
frontmatter, page title and introduction, cross-links, layout notes, and
website-specific components.

## Validation

The generator rejects metadata and custom documentation that do not match the
expected contract.

Manifest validation:

- `version` must be `2`
- `upstreamRoot` must be present
- `externalReferences.v8.displayName` and `externalReferences.v8.cdpRoot` must
  be present
- `domains` must be a list
- `origin` must be `standard` or `lynx-extension`
- `scope` must be `global`, `instance`, or `global-and-instance`
- every method must include `name`, `origin`, and `source`

Custom documentation validation:

- every `lynx-extension` method must have a matching YAML file
- each custom documentation YAML file must match a manifest method
- `summary` is required
- `parameters` and `returns`, when present, must be lists of fields with `name`
  and `type`
- `events` and `notes`, when present, must be lists of strings
- `examples`, when present, must include a `title` and may include `request`
  and `response` mappings

## Output

The generated reference includes:

- an experimental-status warning that explains known coverage and verification
  limits
- global JavaScript runtime support notes for PrimJS and V8
- summary counts for standard methods and Lynx extensions
- a domain overview with scope and method counts, linking to each domain page
- one generated page for each domain
- a generated `_meta.json` that lists the domain pages in filename order
- links to upstream documentation for standard CDP methods
- source-backed details for Lynx extensions, including parameters, return
  fields, events, notes, and examples

Upstream links are derived from `upstreamRoot` in
`cdp_manifest.generated.yaml`:

- domain page: `<upstreamRoot>/<Domain>/`
- method page: `<upstreamRoot>/<Domain>/#method-<method>`

Standard methods should link to upstream parameter and return documentation unless
Lynx behavior needs additional local notes.

The summary explains that the runtime-domain method inventory represents the
PrimJS inspector, which supports both Main-Thread Scripting (MTS) and
Background-Thread Scripting (BTS). V8-backed debugging is delegated to V8
Inspector. Its reference link is derived from
`externalReferences.v8.cdpRoot`; V8 methods are intentionally not listed
individually in this reference.

Domain pages and the domain overview use a shared filename-based order. Labels
preserve the original domain names, while filenames are lowercase and kebab-case.

During rollout, custom documentation whose `summary` starts with `Initial
documentation entry` is omitted from the detailed method sections. The summary
and domain counts continue to include these methods, so readers can see the full
Lynx CDP surface while the method documentation is completed. Replace the
placeholder with source-backed descriptions, request and response details, and
examples to publish the method details.
