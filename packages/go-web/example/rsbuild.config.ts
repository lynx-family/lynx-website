import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import path from 'node:path';
import fs from 'node:fs';

// Discover examples from public/lynx-examples/ (populated by `pnpm prepare`
// which processes @lynx-example/* npm packages).
const examplesDir = path.resolve(__dirname, 'public/lynx-examples');
const exampleNames = fs.existsSync(examplesDir)
  ? fs
      .readdirSync(examplesDir)
      .filter((name) => fs.statSync(path.join(examplesDir, name)).isDirectory())
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

      // --- Semi UI CSS: bypass exports map restriction ---
      '@douyinfe/semi-ui/dist/css/semi.min.css': path.resolve(
        __dirname,
        'node_modules/@douyinfe/semi-ui/dist/css/semi.min.css',
      ),
    },
  },

  tools: {
    sass: {
      sassOptions: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
});
