# Theme and Component Design

This guide covers site UI under `src/` and `theme/`. It complements the
[contribution guide](../CONTRIBUTING.md), including its alias, media, and
downstream compatibility contracts.

## Visual Consistency

- Improve the existing design language before adding another visual variant.
  Reuse established typography, spacing, color, surface, and motion roles.
  A local improvement should make the next component easier to design.
- Add a border, background, shadow, icon, or animation only when it communicates
  hierarchy, state, or interaction. Prefer spacing and surface contrast over
  redundant outlines. Preserve light/dark balance, visible keyboard focus,
  readable contrast, and reduced-motion behavior.
- Separate platform identity, compatibility status, and interaction state.
  A platform color must not implicitly mean supported, selected, or disabled.
  Shared theme tokens define common roles; domain-specific styles implement
  their local presentation.

## Ownership and Naming

- Keep the dependency direction from domain components toward shared identity
  data and rendering primitives. Shared primitives must not import page
  layouts, navigation state, or compatibility-table internals.
- Share stable platform-to-glyph mappings and canonical assets. Keep
  compatibility indicators, feature illustrations, and page-specific state in
  their owning domain. Reuse the renderer without creating one registry that
  mixes unrelated icon sets.
- Name components by their contract. A platform icon represents one platform;
  a group renders several. Use implementation names such as `MaskIcon` only
  for rendering primitives. Do not call a mask-backed element `Svg`.
- Keep helpers private until another real consumer needs them. A new folder
  or component does not automatically require a public barrel export or alias.
  Follow the existing alias and asset contracts when promoting shared code.
- Determine public API from the documented entry and its transitive exports,
  including downstream forwarding barrels. A directory-local `index.ts` is not
  automatically public. Conversely, a downstream deep import is a compatibility
  dependency even when it targets an internal implementation.

## Styles and Overrides

- Scope component rules with CSS Modules or an owning subtree. Only shared
  theme infrastructure may define site-wide tokens and resets. Importing a
  component barrel must not restyle an unrelated component.
- Give each overridable property one authority. For shared icon dimensions,
  CSS consumes `--icon-size` with a fallback; caller classes set that variable.
  Do not also set competing dimensions through utility classes or inline
  defaults. CSS Modules isolate selectors, not inherited custom properties.
- Keep domain defaults at the icon slot. When a composite component exposes a
  size override, use a domain-specific variable and map it to `--icon-size` at
  that slot. Avoid generic icon variables on `:root` or broad page containers.
- Document which element receives `className` and `style`. Distinguish
  container styling from icon-slot styling. Use inline values for dynamic
  data or explicit caller overrides, not fixed defaults that block CSS.
- Tailwind may assign the same CSS variable when the host scans that source.
  Do not depend on class-string order, `tailwind-merge` understanding module
  CSS, or incidental utility generation from another document.
- Preserve glyph proportions and optical alignment. Decorative icons stay
  hidden from assistive technology; controls retain an accessible name.
  Treat vendor prefixes as browser-support behavior and verify emitted CSS
  before changing compatibility diagnostics or build targets.

### Icon Layers and Size Contract

- `components/icons/MaskIcon.tsx` draws a decorative mask. Its `className` and
  `style` target the glyph element. `icons/_mask.scss` supplies the same drawing
  rules to CSS-owned icons, including compatibility indicators and VersionBadge.
  The renderer uses `currentColor`, centers and contains the glyph, and sets
  both standard and WebKit mask properties.
- `components/platform/PlatformIcon.tsx` represents one platform. The existing
  `platform/map-platform-id-to-glyph-name.ts` helper maps platform IDs, and
  `platform/assets/` owns the shared glyphs. Unknown IDs retain the Clay
  fallback. Platform identity colors live in `platform/platform-colors.ts`;
  status and chart colors remain local to their domains.
- Domains own labels, groups, status, and illustrations. `PlatformIconGroup`
  keeps the legacy navigation grouping; `PlatformTabs` owns navigation state;
  `FeatureIcon` selects Lynxtron feature illustrations. These components do not
  change the shared platform mapping.
- These modules are private implementation details, not new `@lynx` exports.
  Public badge/tab names and props remain unchanged. `PlatformTabs.className`
  targets its container; it does not target each glyph.

The renderer reads `--icon-size` without assigning a default on the element:
`width` and `height` both use `var(--icon-size, 1rem)`. A direct caller can set
that variable in its icon class, or use a typed style override for a dynamic
value. A composite component assigns it at the icon slot from its own variable,
for example `--icon-size: var(--platform-badge-icon-size, 0.9rem)`.

| Domain variable                                                  | Default                               |
| ---------------------------------------------------------------- | ------------------------------------- |
| `--platform-badge-icon-size`, `--version-badge-icon-size`        | `0.9rem`                              |
| `--platform-tabs-icon-size`                                      | `24px`; `20px` at narrow widths       |
| `--choice-tabs-platform-icon-size`                               | `13px`                                |
| `--compat-table-icon-size`                                       | `1rem`; `calc(1rem + 1px)` on desktop |
| `--api-status-cell-icon-size`                                    | `18px`; `16px` in the collapsed rail  |
| `--api-status-mini-icon-size`, `--api-status-page-icon-size`     | `11px`, `16px`                        |
| `--home-platform-icon-size`                                      | `18px`                                |
| `--lynxtron-feature-icon-size`, `--lynxtron-extension-icon-size` | `32px`, `20px`                        |
| `--platform-icon-group-size`                                     | `2rem`                                |

Set these variables on the relevant component container or a nearby wrapper.
Compact API Status list glyphs use `--api-status-item-icon-size` (`10px`).
Do not put generic `--icon-size` defaults on page roots. Tailwind v3 syntax
such as `[--icon-size:20px]` is valid in scanned source, but document MDX is not
part of the hosts' normal content globs. Documentation must not rely on a new
utility class being emitted.

## Change Discipline

- Separate rendering-boundary fixes, entry-contract migrations, and unrelated
  stale-code cleanup into reviewable changes.
- Before deleting a component, distinguish an unused export from an unused
  module. Check documents, generated imports, internal consumers, and downstream
  usage. Preserve behavior that still belongs to the maintained replacement.
- Audit downstream authoring sources (`internal_docs`, `internal_shared_docs`,
  source, theme, and generators) as well as prepared `docs` and `sharedDocs`.
  Follow the actual resolver target: identical component names can refer to
  different implementations. Record the consumer revision and OSS pin.
- Keep public names, props, documented style overrides, and asset URLs stable
  while reorganizing internals. Check public assets separately from source
  imports; a consumer-owned component may still use OSS-provided assets.
- Validate the affected surfaces in light and dark appearances, at relevant
  breakpoints, and beside neighboring components. Build success alone does not
  establish visual equivalence.
