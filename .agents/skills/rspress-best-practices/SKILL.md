---
name: rspress-best-practices
description: Configure, review, or troubleshoot Rspress v2 sites, including content conventions, navigation, MDX, assets, search, and deployment.
---

# Rspress best practices

Apply these rules when writing or reviewing Rspress (v2) sites.

## Configuration

- Use `rspress.config.ts` and `defineConfig` from `@rspress/core`
- Set `root` explicitly when docs are not under the default `docs/` directory
- Keep site-wide settings such as `title`, `description`, `icon`, `logo`, `base`, and `lang` in config instead of repeating them in page files
- Prefer first-class Rspress options before custom theme code or low-level bundler overrides
- Keep custom theme code in a top-level `theme/` directory and import original theme pieces from `@rspress/core/theme-original`

## CLI

- Use `rspress dev` for local development
- Use `rspress build` for production output
- Use `rspress preview` only for local preview of the built site
- Use `rspress eject` only when CSS variables, class overrides, or layout wrapping cannot solve the customization

## Docs structure and navigation

- Keep docs content under one clear docs root and group pages by topic or workflow, not by team ownership
- Use `_meta.json` or `_nav.json` to control generated sidebar and navigation labels/order instead of encoding order in filenames; respect explicit `themeConfig.nav`, `themeConfig.sidebar`, and locale-specific settings, which take precedence over file-based generation
- Put reusable MDX snippets or shared components in shared files instead of duplicating them across pages
- Keep landing pages concise and link to deeper task-oriented guides from them

## Writing and frontmatter

- Add clear `title` and `description` frontmatter, and set `sidebar`, `outline`, `navbar`, or `footer` only when page defaults are not enough
- Use `pageType: home`, `doc`, `doc-wide`, `custom`, or `blank` intentionally based on layout needs
- Write task-first headings and short intros; avoid marketing-heavy copy in technical docs
- Prefer one topic per page and split overly long pages by workflow or feature area
- Keep code examples minimal, runnable, and version-accurate

## MDX and components

- Use MDX for interactive docs and embedded components, but keep the main narrative understandable as plain markdown
- Prefer documented Rspress theme/runtime APIs over importing from internal source paths
- Use `globalUIComponents` for app-wide UI such as floating widgets; these render alongside `Layout` under `Root`, so wrap `Root` in a theme override when a provider must supply context to page content

## Theme and styling

- Prefer CSS variables for brand colors, spacing, and surface styling
- Prefer BEM class overrides or `Layout` slots before ejecting built-in components
- In `theme/index.tsx`, always keep `export * from '@rspress/core/theme-original'`, including when overriding a named export; explicit named exports take precedence over the wildcard re-export
- Avoid full component ejection unless config, CSS, and wrapping cannot meet the requirement

## I18n, Search, And AI

- For multilingual sites, organize locale content under per-language directories and keep navigation mirrored where practical
- Keep descriptions and other frontmatter text in the same language as the page content
- Configure search intentionally: use local search for small or medium sites, and hosted search when scale or cross-version indexing requires it
- In Rspress 2.1.5, `llms` controls SSG-MD and LLM indexes and is enabled by default; set `llms: false` when these outputs are not needed, and keep descriptions accurate because the outputs surface page summaries

## Assets and public files

- Import source-managed images and components from docs/theme source when they belong to the content
- Use `public/` only for assets that must keep stable URL paths, such as favicons, social images, or download files
- Reference public assets by absolute site path and make sure they still work when `base` is set

## Plugins and integration

- Prefer official Rspress plugins for search, preview, and API-doc scenarios before building custom solutions
- For component or library docs, use `@rspress/plugin-preview` and `@rspress/plugin-api-docgen` when interactive demos or API tables are needed
- Keep plugin usage explicit in config and remove unused plugins to reduce maintenance cost

## Build, Deploy, And debugging

- Validate both `rspress dev` and `rspress build`; a page that works in dev can still fail during static generation
- Verify broken links, missing assets, and wrong `base` handling before deployment
- Keep generated output out of source control unless the hosting workflow explicitly requires committed artifacts
- When debugging content issues, inspect the resolved docs root, frontmatter, and theme overrides before assuming a bundler problem

## Documentation

- For the latest Rspress docs, read https://rspress.rs/llms.txt
- Use the config and API docs when checking exact option names or current behavior
