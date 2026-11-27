# Lynx Website

This repo contains the website and documentation for Lynx.

## Getting Started

### Prerequisites

- `Node.js >= 22`
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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for pull request guidelines,
downstream compatibility notes, and the release cherry-pick process.

## Downstream Consumers

This repository is the OSS source for shared Lynx documentation, site runtime,
themes, and preparation tooling. A downstream in-house documentation site
consumes a pinned revision through a git submodule and layers internal-only
content and configuration on top.

See [Downstream Compatibility](./CONTRIBUTING.md#downstream-compatibility)
for consumed paths, shared contracts, landing order, and verification.

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
