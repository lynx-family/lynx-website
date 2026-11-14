# Compatibility Table

The Compatibility Table component displays feature compatibility across platforms.

This component is a **presentational** component awaiting a data-fetching container. It serves as a precursor to the `<FetchingCompatTable>` (the internal implementation of `<APITable>` used in the docs).

`FetchingCompatTable` owns loading, fetch errors, and the render error boundary.
Use `<APITable>` in documentation to retain that error handling.

## License

This component is ported from [yari (the MDN Web Docs)](https://github.com/mdn/yari/tree/main/client/src/document/ingredients/browser-compatibility-table), which reads data from [MDN BCD](https://github.com/mdn/browser-compat-data).

The source files in this directory are licensed under the **Mozilla Public License, v. 2.0** (MPL-2.0). A copy of the MPL-2.0 license is included in this directory as `LICENSE`.

If a copy of the MPL was not distributed with these files, you can obtain one at <http://mozilla.org/MPL/2.0/>.

## Usage

```tsx
// Import the data statically
import testData from '@lynx-js/lynx-compat-data/test/api.json';
import platformsData from '@lynx-js/lynx-compat-data/platforms/platforms.json';

<CompatTable
  query="test.api"
  data={testData.test.api}
  browsers={platformsData.platforms}
  locale="en-US"
/>;
```

Do note that directly using this component requires you to static-import the LCD data - which is less convenient to use than its dynamic counterpart - `<APITable />`.

Performance-wise, the static-imported `.json` will be bundled into the route-split `.js` chunk directly, increasing the client bundle size and the initial load time for CSR (client-side rendering). Though it also enables the table to be SSG (static-site generation)-ed into the initial html file.

## Development Notes

This component is ported from [yari (the MDN Web Docs)](https://github.com/mdn/yari/tree/main/client/src/document/ingredients/browser-compatibility-table), which reads data from [MDN BCD](https://github.com/mdn/browser-compat-data).

### Naming

Most of the code is stayed untouched so you will still see `Browser` all over the place.

`LCD` is currently imported as `BCD` in the codebase. To make it work, we simply mapped the usage of `BCD.BrowserBlah` to `LCD.PlatformBlah`.

### Icons

Compatibility/status icon assets remain in `assets/` and are selected by the
table's scoped styles.

Platform headers use the shared `PlatformIcon` in `../../platform/`. Its
canonical glyphs live in `../../platform/assets/`; do not add a second
platform-to-glyph mapping or duplicate platform glyphs here.

### Styles

We copied the dependent SCSS files to `ui/`. Their selectors are scoped under
`.lynx-compat-table`. Mask drawing rules come from the shared icon mixin; the
table owns status colors and its `--compat-table-icon-size` slot.

The rendered table naturally inherits styles from the Lynx website e.g. font sizes and `code` formats, which looks different from the MDN web docs in a good way. We also added some extra tweaks to make it fit with Lynx's docs website.

### TODO

- [ ] Further adjust the UI texts to say Lynx stuffs.
