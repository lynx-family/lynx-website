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

## Overview

### Directory Structure

```md
/
├── docs/
│ ├── public/ ## Static resources
│ ├── en/ ## English docs
│ └── zh/ ## Chinese docs
└── packages/
└── lynx-compat-data/ ## Lynx compatibility data
└── lynx-living-spec/ ## Lynx living specification
└── lynx-example-packages/ ## Lynx example packages
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
