# Custom Framework Performance API Documentation: Open Issues

This file tracks decisions that must be resolved before the custom-framework Performance API integration is declared a stable public contract.

The current documentation structure is:

- `PipelineOptions`: `docs/en/api/lynx-api/performance-api/pipeline-options.mdx`
- `__FlushElementTree`: `docs/en/api/engine/element-api/__FlushElementTree.mdx`
- framework performance hooks: `docs/en/api/lynx-api/lynx/lynx-performance/`
- integration guide: `docs/en/guide/performance/monitor-performance/custom-framework-performance-api-integration.mdx`

## Open issues

### CFP-01: Establish one source of truth for framework-facing types

**Status:** Open

`PipelineOptions`, `FlushOptions`, and the framework performance hooks are declared in more than one runtime package. The public declarations should move to, or be generated from, one framework-neutral source owned by Lynx.

**Decision required:** Select the canonical package and make the API reference match its declarations.

### CFP-02: Reconcile the `PipelineOptions` field set

**Status:** Open

The framework-facing TypeScript declarations include `pipelineID`, `pipelineOrigin`, `needTimestamps`, `dsl`, and `stage`, while the Engine conversion currently serializes only the first three fields.

**Decision required:** Confirm whether `dsl` and `stage` are optional framework metadata, Engine-provided fields, or required fields in every returned object.

### CFP-03: Define field ownership and mutability

**Status:** Open

The contract needs a normative ownership decision for every `PipelineOptions` field. In particular, it must state which fields are Engine-owned, which fields a framework may populate, and whether unknown fields must be preserved by identity or by structured copy.

**Decision required:** Approve the ownership table in the `PipelineOptions` reference and reflect it in public type declarations.

### CFP-04: Confirm `_onPipelineStart()` signatures across runtimes

**Status:** Open

Some TypeScript declarations accept a `PipelineOptions` object as the second argument, while lower-level bindings have historically accepted a pipeline-origin string.

**Decision required:** Define one public signature, document the minimum version that supports it, and specify fallback behavior for older SDKs.

### CFP-05: Define the public `FlushOptions` subset

**Status:** Open

Current framework implementations use options related to layout, lists, asynchronous resolve, data-update callbacks, reload, and pipeline correlation. Several fields are framework-specific or internal implementation details.

**Decision required:** Confirm which fields belong to the public Element PAPI contract. The initial reference documents only `triggerLayout` and `pipelineOptions`.

### CFP-06: Confirm `__FlushElementTree()` overload semantics

**Status:** Open

Existing declarations differ on whether the root argument is optional and whether an options argument is available in every Main Thread Runtime.

**Decision required:** Confirm whole-tree versus subtree behavior, overload availability, and the behavior of an omitted or detached root.

### CFP-07: Define empty, placeholder, and cancellation behavior

**Status:** Open

A pending pipeline must not be consumed by an empty patch, placeholder-only submission, stale patch, reload, or destroyed page. There is not yet one public cancellation protocol shared by all frameworks.

**Decision required:** Define when a framework must retain, commit, cancel, or discard a pending pipeline and whether an explicit Engine hook is required.

### CFP-08: Approve pipeline origins available to custom frameworks

**Status:** Open

`PipelineEntry.name` exposes several origins, but most are created by the Engine or Native integrations. A custom framework normally needs `updateTriggeredByBts` and must not copy ReactLynx-only internal values.

**Decision required:** Publish the exact origins a custom framework may assign and the behavior for an unknown origin.

### CFP-09: Approve framework timing keys and stage semantics

**Status:** Open

The public `FrameworkPipelineTiming` fields define the current timing keys, but some implementation paths also use Engine timing keys such as MTS render boundaries. The existing `stage` description contains ReactLynx-specific language.

**Decision required:** Define framework-neutral `hydrate` and `update` semantics and identify which keys are framework-owned versus Engine-owned.

### CFP-10: Add compatibility data

**Status:** Open

The new references do not yet have machine-readable compatibility data. The API status dashboard also has no dedicated `engine/element-api` category.

**Decision required:** Add minimum versions and platform support for `PipelineOptions`, `__FlushElementTree`, and every framework hook; decide whether Element PAPI compatibility belongs to a new category or to the existing Main Thread API category.

### CFP-11: Add framework-neutral conformance tests

**Status:** Open

The integration guide lists required regression scenarios, but Lynx does not yet provide a reusable conformance suite for custom frameworks.

**Decision required:** Define fixtures and assertions for initial rendering, flagged updates, Native updates, Global Props, reload, empty changes, cancellation, and page destruction on supported platforms.

### CFP-12: Confirm publication status and naming

**Status:** Open

The hooks and Element PAPI use underscore-prefixed names. The documentation must clarify whether these names are stable public APIs for Scripting Framework Developers or version-bound integration hooks.

**Decision required:** Approve the names, audience, stability label, and deprecation policy before removing the integration warning.

## Resolution checklist

- [ ] Resolve CFP-01 through CFP-12.
- [ ] Update the public TypeScript declarations.
- [ ] Add compatibility data and validate it.
- [ ] Update English and Chinese API references.
- [ ] Run the framework conformance suite on every supported platform.
- [ ] Remove temporary stability warnings only after the contract is approved.
