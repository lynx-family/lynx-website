import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { pluginLynxtron } from '@lynx-js/lynxtron-dev-plugins/rspack';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  target: 'electron-main',
  entry: {
    main: './src/main/desktop/main.ts',
    preload: './src/main/desktop/preload.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/desktop/'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: { jsc: { parser: { syntax: 'typescript' } } },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: './package.json', to: 'package.json' },
        { from: './output/bundle/lynx/', to: '.' },
      ],
    }),
    ...(isDev
      ? [
          pluginLynxtron({
            isDev,
            entry: path.resolve(__dirname, './dist/desktop'),
          }),
        ]
      : []),
  ],
  resolve: { extensions: ['.ts', '.js'] },
});
