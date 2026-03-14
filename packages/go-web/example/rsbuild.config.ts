import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import path from 'node:path';
import fs from 'node:fs';

// Discover all examples from the docs directory so we can serve them
// and generate an example list at build time.
const docsExamplesDir = path.resolve(
  __dirname,
  '../../../docs/public/lynx-examples',
);
const exampleNames = fs.existsSync(docsExamplesDir)
  ? fs
      .readdirSync(docsExamplesDir)
      .filter((name) =>
        fs.statSync(path.join(docsExamplesDir, name)).isDirectory(),
      )
      .sort()
  : ['hello-world'];

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],

  html: {
    template: './index.html',
  },

  source: {
    entry: {
      index: './src/main.tsx',
    },
    define: {
      // Inject the example list as a build-time constant
      'import.meta.env.EXAMPLES': JSON.stringify(exampleNames),
    },
  },

  resolve: {
    alias: {
      // --- Deduplicate React (go-web source uses relative imports) ---
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),

      // --- Replace rspress APIs with standalone adapters ---
      '@rspress/core/runtime': path.resolve(
        __dirname,
        'src/adapters/rspress-runtime.tsx',
      ),
      '@rspress/core/shiki-transformers': path.resolve(
        __dirname,
        'src/adapters/rspress-shiki-transformers.ts',
      ),
      '@theme': path.resolve(__dirname, 'src/adapters/theme-code-block.tsx'),

      // --- Semi UI CSS: bypass exports map restriction ---
      '@douyinfe/semi-ui/dist/css/semi.min.css': path.resolve(
        __dirname,
        'node_modules/@douyinfe/semi-ui/dist/css/semi.min.css',
      ),
    },
  },

  server: {
    // Serve example data from the docs directory so ALL examples work
    // without copying files into the example's public/ directory.
    publicDir: [
      { name: path.resolve(__dirname, 'public') },
      { name: path.resolve(__dirname, '../../../docs/public'), watch: false },
    ],
  },

  tools: {
    sass: {
      sassOptions: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
});
