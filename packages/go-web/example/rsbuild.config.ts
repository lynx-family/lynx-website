import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],

  html: {
    template: './index.html',
  },

  source: {
    entry: {
      index: './src/main.tsx',
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

  tools: {
    sass: {
      sassOptions: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
});
