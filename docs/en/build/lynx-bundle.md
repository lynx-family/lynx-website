---
description: 'What a Lynx Bundle is, how it differs from a web build, and how it is produced.'
---

# What is a Lynx Bundle?

A Lynx Bundle is what a Lynx app ships: a single binary file ending in `.lynx.bundle`. The container hands its URL or its bytes to the Lynx Engine, and the page renders.

A web app ships a set of files — an HTML entry, some JS, some CSS — and the browser fetches them one by one as the HTML references them. Lynx does not work that way. One build produces one file, with the styles and the scripts encoded inside it.

## How it differs from a web build

|               | Web                                       | Lynx                                                    |
| ------------- | ----------------------------------------- | ------------------------------------------------------- |
| Entry         | `index.html`                              | No HTML; the container loads the bundle directly        |
| Styles        | Separate `.css` files, fetched at runtime | Parsed into style data and encoded into the bundle      |
| Scripts       | Separate `.js` files, fetched at runtime  | Inlined into the bundle by default                      |
| Static assets | Separate files                            | Separate files too; small ones are inlined as data URIs |
| Threads       | Single-threaded                           | One build per thread, both inside the same bundle       |

Static assets are the only part that still lands in `dist/` as separate files. See [Output Files](./output.md) for the full directory layout.

## What is inside a bundle

Every bundle carries at least four kinds of content:

- **Main-thread code** — creates the elements of the first screen; `main-thread.js` in the intermediate output
- **Background-thread code** — your full application logic; `background.js`
- **Styles** — every CSS rule, parsed into structured data
- **Page config** — switches such as `enableCSSInheritance` and `enableNewGesture`, plus metadata such as which framework built it

## How the dual-thread output is produced

Lynx's dual-thread architecture means one source tree compiles into two outputs. The build keeps them apart with Rspack **layers**: one layer for the main thread, one for the background thread, each with its own module graph.

That split does two things. A module can resolve differently per layer — ReactLynx uses `@lynx-js/react/lepus` on the main thread and `@lynx-js/react` on the background thread. And markers like `background only` can act per layer: the code they mark never enters the main-thread graph, which keeps the first-screen path small.

Both layers land in the intermediate output directory, `dist/.lynx/<entry>/`:

```txt
dist/.lynx/<entry>/
├── main-thread.js      # compiled main-thread layer
├── background.js       # compiled background-thread layer
├── <entry>.css         # styles
├── tasm.json           # the encoder's input
└── debug-metadata.json # metadata for mapping production errors back to source
```

These files stay on disk only in development builds, or when `DEBUG` contains `lynx`. A production build still produces them, then deletes them from the output once they are encoded into the bundle.

## From intermediates to a binary

`tasm.json` is the encoder's input, and the readable version of the bundle. It organizes the content above into a few fields:

| Field             | Content                                                |
| ----------------- | ------------------------------------------------------ |
| `lepusCode`       | Main-thread code                                       |
| `manifest`        | Background-thread code; `/app-service.js` is the entry |
| `css`             | Structured style data                                  |
| `sourceContent`   | Page config, the framework, the app type               |
| `compilerOptions` | Encoder switches                                       |

The last step belongs to [`@lynx-js/tasm`](https://www.npmjs.com/package/@lynx-js/tasm): it takes what `tasm.json` describes and encodes it into the binary written as `.lynx.bundle`.

To see what a build actually encoded, open `dist/.lynx/<entry>/tasm.json`.

## An app can have more than one bundle

Besides the main bundle:

- **Lazy bundles** — a component behind a dynamic `import()` is encoded into its own `.lynx.bundle` under `lazy-bundle/`, fetched at runtime. See [Code Splitting](/react/code-splitting.md).
- **External bundles** — shared dependencies built once into a bundle that several apps load. See [External Bundle](./external-bundle.mdx).

## The web output

The same source can also be built for the web. There the Rsbuild environment is named `web`, the output is a `.web.bundle`, and `<lynx-view url="...">` loads it. The `[platform]` placeholder in a filename is that environment name, which is why the default `[name].[platform].bundle` gives you `main.lynx.bundle` in one environment and `main.web.bundle` in the other.

## Next steps

- [Rsbuild and Rspeedy](./tools.md) — how to build a Lynx Bundle
- [Output Files](./output.md) — the output directory layout and filename options
