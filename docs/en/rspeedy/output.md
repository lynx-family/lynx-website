# Output Files

This chapter will introduces the directory structure of output files and how to control the output directory of different types of files.

## Default Directory Structure

The following is a basic directory for output files. By default, the compiled files will be output in the `dist` directory of current project.

### Production

In production, the `dist/` directory contains all the files that need to be deployed.

```txt
dist/
├── [name].lynx.bundle
├── async
│   └── [name].lynx.bundle
└── static
    ├── image
    │   └── [name].[hash].png
    ├── svg
    │   └── [name].[hash].svg
    └── js
        ├── [id].[hash].js
        │   └── async
        │       └── [id].[hash].js
        └── lib-preact.[hash].js
```

The most common output files are Bundle files, JS files and static assets:

- Bundle files(`[name].lynx.bundle`), which can be configured with [`output.filename.bundle`].
- Async(lazy) bundle files(`async/[name].lynx.bundle`).
- JS files(`static/js/*.js`), which can be configured with [`output.distPath.js`] and [`output.filename.js`].
- Static assets(`static/{font,image,media,svg}`) directory.

In the filename, `[name]` is the entry name corresponding to this file, such as `index`, `main`. `[hash]` is the hash value generated based on the content of the file. `[id]` is the internal chunk ID of Rspack.

### Development

In development, an `dist/.rspeedy` directory is emitted which contains the resources for debugging.

```txt
dist/
├── .rspeedy
│   ├── async
│   │   └── [name]
│   │       ├── debug-metadata.json
│   │       ├── tasm.json
│   │       └── [name].css
│   ├── [name]
│   │   ├── background.js
│   │   ├── debug-metadata.json
│   │   ├── [name].css
│   │   ├── main-thread.js
│   │   └── tasm.json
│   └── rspeedy.config.js
├── [name].lynx.bundle
└── static
    ├── image
    │   ├── [name].[hash].png
    │   └── [name].[hash].svg
    └── js
        ├── [id].[hash].js
        │   └── async
        │       ├── [id].[hash].js
        ├── lib-preact.[hash].js
```

In addition, Rspeedy generates some extra files in development:

- Background Thread Script(BTS): The background script file that is inlined into the bundle, default output to `.rspeedy/[name]/background.js`.
- MainThread Thread Script(MTS): The main-thread script file that is inlined into the bundle, default output to `.rspeedy/[name]/main-thread.js`.
- Source Map files: contains the source code mappings, which is output to the same level directory of JS files and adds a `.map` suffix.

## Modify the Directory

Rspeedy provides some configs to modify the directory or filename, you can:

- Modify the filename through [`output.filename`].
- Modify the output path of through [`output.distPath`].
- Modify the license file through [`output.legalComments`].
- Modify Source Map file through [`output.sourceMap`].

## Flatten the Directory

Sometimes you don't want the dist directory to have too many levels, you can set the directory to an empty string to flatten the generated directory.

See the example below:

```js
import { defineConfig } from '@lynx-js/rspeedy';

export default defineConfig({
  output: {
    distPath: {
      js: '',
    },
    filename: {
      bundle: '[name].lynx.bundle',
    },
  },
});
```

The above config produces the following directory structure:

```bash
dist
├── [id].[hash].js
├── [id].[hash].js.map
└── [name].lynx.bundle
```

[`output.filename`]: /api/rspeedy/rspeedy.output.filename
[`output.filename.js`]: /api/rspeedy/rspeedy.filename.js
[`output.filename.bundle`]: /api/rspeedy/rspeedy.filename.bundle
[`output.distPath`]: /api/rspeedy/rspeedy.output.distpath
[`output.distPath.js`]: /api/rspeedy/rspeedy.distpath.js
[`output.legalComments`]: /api/rspeedy/rspeedy.output.legalcomments
[`output.sourceMap`]: /api/rspeedy/rspeedy.output.sourcemap
