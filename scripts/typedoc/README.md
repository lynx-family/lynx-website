# @lynx-js/tool-typedoc

This is a tool used to generate the API reference docs from TypeScript declaration files for Lynx Docs. It's intended to be run in the root of the `lynx-docs` repo via `tsx`.

## Usage

This section walks through the process of updating documentation generated from npm distributed typed packages. Throughout this document, we will assume we want to update TypeDoc definitions of property inside `@lynx-js/react` as an example.

> For more information on how TypeDoc/JSDoc parses comments, see [**Doc comments in TypeDoc documentation**](https://typedoc.org/guides/doccomments/).

### Step 1: Install or Update the package's types

First, install the package's types as a dev dependency.

```bash
pnpm install -D @lynx-js/react
```

Or update the package's types if it's already installed.

```bash
pnpm update -D @lynx-js/react
```

### Step 2: Configure TypeDoc Package Configuration

In `scripts/typedoc/packages/index.ts`, find the `PACKAGES` object and add or update the entry for the package. The configuration follows the `PackageConfig` type:

```ts
export const PACKAGES: Record<string, PackageConfig> = {
  react: {
    out: 'api/react',
    tsconfig: 'node_modules/@lynx-js/react/tsconfig.json',
    en: {
      entryPoints: ['node_modules/@lynx-js/react/types/react.docs.d.ts'],
    },
    zh: {
      entryPoints: ['node_modules/@lynx-js/react/types/react.docs.zh.d.ts'],
      options: {
        readme: 'node_modules/@lynx-js/react/README.zh.md',
      },
    },
  },
};
```

This will generate the docs in `docs/en/api/react` and `docs/zh/api/react` from the TypeScript declaration file `node_modules/@lynx-js/react/types/react.d.ts`.

A `tsconfig` is needed to tell TypeDoc how to compile the TypeScript declaration files. The best practice is to ship `tsconfig.typedoc.json` with the package to be in sync with the real `tsconfig.json` used in the package, but if the package doesn't have one, you can create one in the `scripts/typedoc/tsconfigs` directory and reference it here.

An optional `options` is available for package-based and locale-based TypeDoc and TypeDoc-Markdown plugin customization.

### Step 3: Run the script

```bash
# repo root

# update all packages
pnpm run typedoc

# update a single package
pnpm run typedoc --package react

# update multiple packages
pnpm run typedoc --package react lynx-ui
```

After running the script, you should see the generated docs in the `docs/zh/api` and `docs/en/api` directory.

### Step 4: Config the Docs `_meta.json`

Do note that this script only generates the `.mdx` files and doesn't update the `_meta.json` files, which means the new docs won't be shown in the website by default if the output directory is not specified in the `_meta.json` file.

This gives us the flexibility to separate the concerns of how the `.mdx` files are generated from how the website uses them. For example:

- we can generate the docs for `lynx-ui` with the `modules` output strategy and selectively show/hide/alias generated pages in the navigation;
- while generate the docs for `react` with the `members` output strategy and list all the members in the `api/react` directory.

### Step 5: Verify the final Docs

Following the `README.md` in the root of the `lynx-docs` repo to run the website locally and verify the changes.

## Development Notes for Local Development

Sometimes you may want to update the docs according to the local versions of `@lynx-js` packages so local testing. This is particularly useful when you are trying to tweak the type declarations for a package and test its API docs output in the website.

You can do so by linking the local packages to the `lynx-docs` repo.

### Step 1: Link the package globally at the package repo

We will again use `@lynx-js/react` as an example.

```bash
cd react;

# pnpm
pnpm link --global

# npm
npm link
```

This will present this package in the global `node_modules` directory for other projects to link to.

Do remember to run the build in watch mode if your project requires a build step, so that changes are automatically rebuilt.

### Step 2: Use the linked package in the `lynx-docs` repo

```bash
cd lynx-docs;

# pnpm
pnpm link @lynx-js/react --global

# npm
npm link @lynx-js/react
```

This will create a symbolic link from your global `node_modules` to your local package, allowing you to use the local version instead of the published one.

This way, changes to the local package will be reflected in the `lynx-docs` repo immediately.
