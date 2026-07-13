import { pluginLynxConfig } from '@lynx-js/config-rsbuild-plugin';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@lynx-js/rspeedy';

export default defineConfig({
  plugins: [
    pluginReactLynx(),
    pluginLynxConfig({
      enableCSSInlineVariables: true,
    }),
  ],
  source: {
    entry: {
      'plan-picker': './src/plan-picker/index.tsx',
    },
  },
  environments: {
    web: {},
    lynx: {},
  },
  server: {
    port: 8080,
  },
  output: {
    assetPrefix: 'https://lynxjs.org/lynx-examples/openui/dist',
    filename: '[name].[platform].bundle',
  },
});
