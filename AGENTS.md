# Downstream Compatibility

This repository is consumed by the in-house Lynx documentation site through a
pinned git submodule and local `file:` dependency.

## Directly Consumed Paths

The downstream prepare flow consumes these OSS paths:

- Copied or merged content: `docs/`, `i18n.json`, and `sharedDocs/`
- Symlinked runtime: `src/` and `theme/`
- Imported configuration: `tailwind.config.js`
- Package contract: `package.json`
- Generated-data inputs: `packages/lynx-living-spec/`,
  `packages/lynx-compat-data/`, `packages/lynx-example-packages/`,
  `packages/lynx-ui-example-packages/`, and
  `packages/lynxtron-example-packages/`

The downstream repository replaces `docs/public/lynx-examples` and applies
internal content overlays after copying OSS content.

## Downstream Tool Contract

The downstream prepare flow directly executes:

- `scripts/luna-demo.js`
- `scripts/lynx-example.js`

The downstream currently synchronizes `scripts/lynx-living-spec.js` into its
workspace and runs it through `pnpm gen:living-spec`.

Keep these script paths, caller-working-directory behavior, environment
variables, and generated output layouts compatible with downstream callers.

## Mirrored Integration Contracts

The downstream repository maintains local versions of
`shared-route-config.ts`, `shared-og-config.ts`, `rspress.config.ts`, and
`tsconfig.json`. These files are not copied from OSS, but their runtime
contracts must remain compatible.

Keep OSS runtime imports compatible with the downstream resolver aliases.
Coordinate changes to shared configuration exports or resolver aliases with
the downstream repository.

The in-house scheduled sync runs daily at 09:30 UTC+8. For coordinated changes,
especially those that must land internally first, plan the landing order around
this window so an OSS change is not synced before its downstream counterpart is
ready.

## Host-Root Imports

`@site` resolves to the consuming site's repository root. Existing `@site/*`
imports are part of the current OSS/downstream compatibility surface.

Do not add a new `@site/*` import merely to avoid a relative path or to reach
consumer-specific configuration. For new code:

- Use a relative import when the target remains inside the owning OSS module.
- Use an OSS-owned package export for reusable shared code.
- Use a documented exact-match resolver alias when a downstream site must
  intentionally inject configuration. For example, `@og-config` is configured
  as the exact-match `@og-config$` alias in Rspress.

Any new `@site/*` dependency requires a matching module and compatibility
contract in every supported consumer.

## Change Rules

- Do not rename or remove a consumed path without a compatibility plan and a
  coordinated downstream update.
- Treat package names, script environment variables, output directories, and
  exported configuration fields as interfaces.
- Keep internal-only content and behavior in the in-house repository.
- Request downstream validation for changes affecting this contract.

## Verification

When a change affects any downstream compatibility contract above, verify this
repository with:

```sh
pnpm run prepare
pnpm run build
```

Then request validation against the updated OSS pin in the in-house repository,
following that repository's own setup and build instructions.
