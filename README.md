# Lynx Website

This repo contains the website and documentation for Lynx.

## Getting Started

### Prerequisites

- `Node.js >= 18`
- `pnpm` (`corepack enable` is recommended)

Install dependencies:

```bash
pnpm install
```

### Local Development

Start the dev server

```bash
pnpm run dev
```

Open [http://localhost:3000/](http://localhost:3000/).

### Production Build

```bash
pnpm run build
```

To preview the production build locally:

```bash
pnpm run preview
```

## Downstream Consumers

This repository is the OSS source for shared Lynx documentation, site runtime,
themes, and preparation tooling. A downstream in-house documentation site
consumes a pinned revision through a git submodule and layers internal-only
content and configuration on top.

Changes to directly consumed content such as `docs/`, `i18n.json`, and
`sharedDocs/`, as well as package metadata, shared configuration contracts,
runtime source, themes, preparation scripts, or example-package layouts can
affect downstream consumers. Contributors changing this boundary must
coordinate downstream validation after the updated OSS revision is pinned.

The in-house repository synchronizes OSS changes daily at 10:00 UTC+8. For
coordinated changes, especially those that must land internally first, land the
downstream counterpart before the OSS change can be synchronized, or time the
OSS merge around that window.

See [AGENTS.md](./AGENTS.md) for the detailed compatibility contract and
verification requirements.

## Overview

### Directory Structure

```text
/
├── docs/
│   ├── en/                         # English documentation
│   ├── zh/                         # Chinese documentation
│   └── public/                     # Static and generated assets
├── sharedDocs/                     # Generated lynx-ui documentation
│   ├── introDocs/                  # lynx-ui package introductions
│   └── packageDocs/                # lynx-ui package API documentation
├── src/
│   ├── components/                 # Documentation UI components
│   ├── hooks/                      # Shared React hooks
│   ├── lib/                        # Site runtime utilities
│   ├── luna/                       # Luna integration
│   ├── lynx-ui/                    # lynx-ui site runtime
│   └── styles/                     # Global styles
├── theme/
│   └── lynx-ui-home/               # Rspress theme and lynx-ui homepage
├── packages/
│   ├── lynx-cdp/                   # CDP documentation generator
│   ├── lynx-compat-data/           # Lynx compatibility data
│   ├── lynx-example-packages/      # Core example dependencies
│   ├── lynx-living-spec/           # Lynx living specification
│   ├── lynx-ui-example-packages/   # lynx-ui example dependencies
│   └── lynxtron-example-packages/  # Lynxtron example dependencies
├── plugins/
│   └── llms-postprocess/           # Local Rspress LLMs plugin
├── scripts/                        # Prepare and documentation tooling
├── functions/                      # Deployment middleware
├── rspress.config.ts               # Site build configuration
├── shared-route-config.ts          # Shared route contracts
├── shared-og-config.ts             # Shared Open Graph contracts
└── tailwind.config.js              # Shared Tailwind configuration
```

## Credits

lynx-website uses the following third-party libraries and more. Thanks to all the contributors of these libraries:

| Name                                                       | Description                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Rspress](https://github.com/web-infra-dev/rspress)        | A fast Rsbuild-based static site generator.                                        |
| [React](https://github.com/facebook/react)                 | A JavaScript library for building user interfaces.                                 |
| [Radix UI](https://github.com/radix-ui)                    | Components, icons, colors, and templates for building high-quality, accessible UI. |
| [Semi UI](https://github.com/DouyinFE/semi-design)         | A modern, comprehensive, flexible design system and React UI library.              |
| [Tailwind CSS](https://github.com/tailwindcss/tailwindcss) | A utility-first CSS framework.                                                     |

This Lynx-website is powered by [Netlify](https://www.netlify.com/).
