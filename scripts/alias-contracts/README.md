# Alias Contracts

Gate 1 of [#1487](https://github.com/lynx-family/lynx-website/issues/1487)
defines portable alias policy and validates registry data. Resolver behavior
belongs to [#1504](https://github.com/lynx-family/lynx-website/issues/1504);
import policy and migration baselines belong to
[#1505](https://github.com/lynx-family/lynx-website/issues/1505).

- [`registry.ts`](./registry.ts): owners, aliases, OSS source map, local overrides.
- [`types.ts`](./types.ts): field semantics and valid schema variants.
- [`check-registry.ts`](./check-registry.ts): structural validator and packaged CLI.
- [`UNDERSTANDING.md`](./UNDERSTANDING.md): ownership and resolution examples.

## Changing Policy

Update the owning registry record and its focused tests together. Keep physical
paths in source maps. Gates 2/3 derive concrete specifiers from source imports;
do not register component filenames, package-document lists, or asset inventories.

An implementation target must satisfy **both**:

1. Its source-area ID is in `implementationSources.requiredAreas`, or its
   owner is in `implementationSources.additionalOwners`.
2. Its owner is allowed for the import form: `bareTargetOwners` for a bare
   entry, `subpaths.targetOwners` for a direct subpath.

Gate 1 checks the policy's structure. Gate 2 applies these conditions to the
first resolved target. `additionalOwners` does not create new source-map IDs
or override source-map ownership rules.

`mayExtendBare: true` requires consumer target and additional-source permission.
A consumer wrapper must preserve all OSS barrel exports and may add unique
names. Direct subpaths retain their separate owner policy.

Source areas use normalized repository-relative roots. Mounted/generated areas
need non-empty `origins`; authoritative areas omit them. Explicit roots must
not overlap. Producer-derived importer classification is assembled by the
shared corpus layer, not by adding broad language trees to this registry.

Local resolver overrides require an exact specifier, reason, parity,
lifecycle, and removal condition. They describe declared exceptions, not
proof that a workaround is still needed. Gate 2 verifies resolver behavior
and removes obsolete keys together with their records.

## Downstream CLI Contract

Consumers supply physical data and optional private aliases without redefining
OSS owners or aliases:

| Option                          | Required module export | Default when omitted                                      |
| ------------------------------- | ---------------------- | --------------------------------------------------------- |
| `--source-map <module>`         | `sourceAreas`          | OSS source map                                            |
| `--resolver-overrides <module>` | `resolverOverrides`    | Empty with a consumer source map; otherwise OSS overrides |
| `--alias-extensions <module>`   | `aliasExtensions`      | Empty                                                     |

Modules may be `.mjs` or `.ts`. Paths resolve from the caller's working
directory; `file:` URLs are also accepted. Consumers must declare `tsx`
directly and run the checker with `node --import tsx`.
Each requested export must be an array; explicitly exporting `undefined`
is invalid and does not select the default for an omitted option.

The checker keeps a private snapshot of shared policy and deep-copies defaults
before loading any consumer module. Mutating registry exports cannot alter
the policy used by that invocation or later calls in the same process.

A replacement source map must retain **every OSS source-area ID and owner**,
including classification-only areas. Roots, roles, and origins may change
with the layout. New IDs must be consumer-owned. This is distinct from
`additionalOwners`, which governs where a particular alias may resolve.

The following is a **partial excerpt**, not a complete replacement map:

```js
// scripts/alias-source-areas.mjs
// @ts-check
/** @typedef {import('@lynx-js/lynx-doc/scripts/alias-contracts/types.js').SourceArea} SourceArea */
/** @satisfies {readonly SourceArea[]} */
export const sourceAreas = [
  // Include all OSS IDs with this consumer's physical mappings.
  {
    id: 'consumer-component-entry',
    root: 'src/entries/components.ts',
    owner: 'consumer',
    role: 'authoritative',
  },
  {
    id: 'consumer-local-source',
    root: 'src/local',
    owner: 'consumer',
    role: 'authoritative',
  },
];
```

For local exceptions, a separate module exports `resolverOverrides`; export
`[]` explicitly when using an empty override module.

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-registry.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs \
  --alias-extensions ./scripts/alias-extensions.ts
```

The packaged checker path, option names, module export names, and
caller-working-directory behavior are downstream compatibility interfaces.

### Consumer Private Aliases

Use an extension for unrelated site-local source, such as generated UI.
`ConsumerAliasExtension` narrows the existing `AliasContract` schema:

- Owner, allowed importers, and bare/direct target owners must all be `consumer`;
  visibility must be `owner-private`.
- `implementationSources.requiredAreas` must list at least one declared
  consumer-owned area. `additionalOwners` must be empty, so this list bounds
  implementation sources even if more consumer areas are added later.
- IDs and accepted import specifiers must not collide with shared aliases,
  other extensions, or resolver overrides. All three alias shapes are supported.

```ts
// scripts/alias-extensions.ts
import type { ConsumerAliasExtension } from '@lynx-js/lynx-doc/scripts/alias-contracts/types.js';

export const aliasExtensions = [
  {
    id: 'consumer-local',
    specifier: '@local',
    owner: 'consumer',
    visibility: 'owner-private',
    kind: 'subpaths-only',
    allowedImporters: ['consumer'],
    subpaths: {
      targetOwners: ['consumer'],
      lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
    },
    canonical: { omitIndex: false, omitSourceExtensions: false },
    allowMultipleResolverRoots: false,
    implementationSources: {
      requiredAreas: ['consumer-local-source'],
      additionalOwners: [],
    },
    downstream: { implementation: 'required' },
    lifecycle: { state: 'stable', changePolicy: 'owner-controlled' },
  },
] as const satisfies readonly ConsumerAliasExtension[];
```

The prefix is chosen by the consumer, not registered in OSS. These records
apply only when supplied; `downstream.implementation` does not oblige other
sites to implement this local alias. `mayExtendBare` on shared aliases still
governs extension of their OSS barrels; local bare entries set it to `false`
and own their exports directly.

Adding policy does not configure a resolver or rewrite imports. Configure the
site's runtime and TypeScript aliases, update code-generator alias settings,
and migrate consumer-local imports together. Gate 2 must use the validated
union of shared aliases and extensions with the same active source map, then
check the first resolved target against the declared areas and owners.

## Verification

```bash
pnpm check:alias-contract-types
node --import tsx --test scripts/alias-contracts/check-registry.test.ts
pnpm check:alias-contracts
```

The test suite packs the complete package without lifecycle scripts, extracts
it into a temporary consumer's `node_modules`, and checks all three CLI options
and shared-policy mutation regressions through the installed entry point.

For downstream contract changes, also run `pnpm run prepare`,
`pnpm run build`, and `pnpm pack --dry-run`. Before merge, obtain downstream
packaged-checker, prepare, and build results against the exact candidate pin.
Gate 1 does not scan imports, resolve modules, or verify files exist.
