# Alias Contracts

This work is tracked by the
[portable alias contract umbrella issue](https://github.com/lynx-family/lynx-website/issues/1487).
The Lynx documentation, runtime source, and theme are consumed from multiple
repository layouts, so resolver aliases act as cross-repository interfaces:
an import must retain the same logical meaning when its physical target moves.

This directory centralizes the ownership, supported import forms, canonical
spelling, and local exceptions that were previously distributed across
configuration and convention. Each alias is one contract, so the directory
uses the plural name `alias-contracts`.

## Files

- [`registry.mjs`](./registry.mjs) is the single policy registry.
- [`types.d.ts`](./types.d.ts) documents the data model and provides editor
  checks for the JavaScript registry.
- [`check-registry.mjs`](./check-registry.mjs) validates the registry and
  optional consumer-owned physical data.
- [`check-registry.test.ts`](./check-registry.test.ts) covers every
  structural rule and the consumer CLI boundary.
- [`package.json`](./package.json) makes this toolchain an ESM subpackage
  without changing the root repository's module mode.
- [`tsconfig.json`](./tsconfig.json) provides strict, no-emit type checking.

Do not create another alias matrix, public-subpath list, or resolver-override
allowlist. Resolver configuration implements these contracts but does not
define the policy.

## Data Model

`owners` defines stable logical ownership. It does not describe checkout
locations.

`aliases` defines portable import namespaces, supported bare and subpath forms,
allowed importer owners, canonical spelling, source-area references, downstream
obligations, and lifecycle.

`ossSourceAreas` binds logical source-area IDs to physical paths in this
repository. Consumers provide the IDs referenced by shared aliases at their
own physical paths and may add areas needed to classify consumer-owned source.

`ossResolverOverrides` contains exact repository-local exceptions. Overrides
are not portable aliases and are not inherited by consumers.

## Changing the Registry

### Register An Alias

Add one record to `aliases` with its owner, visibility, kind, supported forms,
allowed importers, canonical spelling, source-area references, downstream
behavior, and lifecycle.

Keep physical paths out of alias records. Reference source-area IDs instead.

### Register A Public Subpath

Add each reviewed public module or bounded namespace to `publicSubpaths`.
Resolver reachability alone does not make a subpath public.

Use canonical paths without a trailing `/index` or JavaScript/TypeScript source
extension. Use `module` for one exact path and `namespace` when descendants are
also public.

### Register A Source Area

Add repository paths to `ossSourceAreas`. Each area needs a stable ID, logical
owner, normalized repository-relative root, and role.

`mounted` and `generated` areas must also identify one or more canonical
origins through a non-empty `origins` array. Multiple entries describe a final
tree assembled from several repositories or roots, such as OSS content plus a
consumer overlay. Source roots must not overlap because later import scanners
need one unambiguous owner per file.

### Register A Resolver Override

Add repository-local exceptions only to `ossResolverOverrides`. Every override
must:

- use an exact specifier;
- state why portable alias resolution is insufficient;
- declare runtime and TypeScript parity expectations;
- declare its lifecycle state;
- state a concrete removal condition.

Add focused validation tests in the same pull request. An undeclared or
incomplete future override must fail the checker.

## Downstream Consumer Data

Downstream consumers use the packaged checker without redefining OSS owners or
aliases. Optional modules export physical `sourceAreas` and local
`resolverOverrides`. A downstream consumer should invoke the checker through
its own repository-local package script or orchestration script, which owns its
paths and overlay preparation.

Consumer adapters are ESM modules. Use `.mjs` by default; it remains supported
so a consumer does not need to migrate its own data adapters to TypeScript.
Consumers may also use `.ts` adapters because the checker runs through
`node --import tsx`, but they must declare `tsx` directly. Both formats export
the same `sourceAreas` or `resolverOverrides` binding and are runtime-validated
as untrusted input.

Source areas that reuse an OSS ID must retain that ID's logical owner, while
their root, role, and origins may reflect the downstream layout. Additional
source-area IDs must be consumer-owned.

The following `.mjs` excerpt illustrates one composite area. A real
`--source-map` module replaces the complete OSS source map and must provide
every OSS source-area ID, including areas used only to classify legacy imports.

```js
// scripts/alias-source-areas.mjs
// @ts-check

/** @typedef {import('@lynx-js/lynx-doc/scripts/alias-contracts/types.js').SourceArea} SourceArea */

/** @satisfies {readonly SourceArea[]} */
export const sourceAreas = [
  {
    id: 'site-public-assets',
    root: 'docs/public/assets',
    owner: 'consumer',
    role: 'generated',
    origins: [
      {
        repository: 'lynx-family/lynx-website',
        root: 'docs/public/assets',
      },
      {
        repository: 'consumer/docs-site',
        root: 'docs/public/assets',
      },
    ],
  },
];
```

```js
// scripts/resolver-overrides.mjs
// @ts-check

/** @typedef {import('@lynx-js/lynx-doc/scripts/alias-contracts/types.js').ResolverOverride} ResolverOverride */

/** @satisfies {readonly ResolverOverride[]} */
export const resolverOverrides = [
  // Consumer-local exact exceptions with explicit removal conditions.
];
```

```bash
node --import tsx \
  node_modules/@lynx-js/lynx-doc/scripts/alias-contracts/check-registry.ts \
  --source-map ./scripts/alias-source-areas.mjs \
  --resolver-overrides ./scripts/resolver-overrides.mjs
```

The checker is TypeScript, so downstream wrappers must declare `tsx` directly
and invoke it through `node --import tsx`. The packaged CLI path, option names,
and module export names are compatibility interfaces used by that downstream
orchestration.

## Verification

```bash
pnpm check:alias-contract-types
node --import tsx --test scripts/alias-contracts/check-registry.test.ts
pnpm check:alias-contracts
```

This Gate 1 checker validates data structure only. Resolver parity belongs to
Issue #1504, and source-import scanning belongs to Issue #1505.
