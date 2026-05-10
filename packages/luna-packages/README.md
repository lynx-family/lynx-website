# Luna Packages

Aggregates L.U.N.A demo-related packages for the documentation site and provides a small set of exports used by the site runtime.

## What is this package for?

- Pulls in Luna demo dependencies from npm for the Lynx docs site
- Exposes Rspress-site components (e.g. `LunaStudio`) from `src/`

This package is primarily an internal dependency of the documentation site.

## Usage

```ts
import { LunaStudio } from '@lynx-js/luna-packages';
```

## Notes

- Demo assets used by the site are prepared by the repo script `prepare:luna` (see `scripts/luna-demo.js` in the repository root).
- Some components rely on Tailwind utility classes. The docs site includes this package's sources in Tailwind `content` scanning.
  - In this repository: the Tailwind config at the repo root (`/tailwind.config.js`) includes `./packages/luna-packages/src/**/*.{js,ts,jsx,tsx}`.
  - If you consume `@lynx-js/luna-packages` from another project and want the styles to work, add it to your Tailwind `content` globs, for example:

```js
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@lynx-js/luna-packages/src/**/*.{js,ts,jsx,tsx}',
  ],
};
```
