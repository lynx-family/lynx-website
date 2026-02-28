import {
  LynxEncodePlugin,
  LynxTemplatePlugin,
} from '@lynx-js/template-webpack-plugin';

const LAYERS = {
  MAIN_THREAD: 'main-thread',
  BACKGROUND: 'background',
};
const NAME = 'vanilla';

/**
 * @type {import("@rspack/core").Configuration}
 */
const config = {
  entry: {
    [`${NAME}@main-thread`]: {
      layer: LAYERS.MAIN_THREAD,
      import: './src/index.main-thread.js',
    },
    [`${NAME}@background`]: {
      layer: LAYERS.BACKGROUND,
      import: './src/index.js',
    },
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.css$/,
  //       issuerLayer: LAYERS.BACKGROUND,
  //       type: 'css/auto',
  //       use: ['ignore-loader'],
  //     },
  //   ],
  // },
  output: {
    publicPath: 'https://lynxjs.org/lynx-examples/vanilla-lynx-bundle/dist',
  },
  plugins: [
    new LynxEncodePlugin({}),
    new LynxTemplatePlugin({
      filename: `${NAME}.lynx.bundle`,
      intermediate: NAME,
    }),
    /**
     * @param {import("@rspack/core").Compiler} compiler
     */
    (compiler) => {
      compiler.hooks.thisCompilation.tap(
        'MarkMainThreadWebpackPlugin',
        /**
         * @param {import("@rspack/core").Compilation} compilation
         */
        (compilation) => {
          compilation.hooks.processAssets.tap(
            'MarkMainThreadWebpackPlugin',
            () => {
              const asset = compilation.getAsset(`${NAME}@main-thread.js`);
              compilation.updateAsset(asset.name, asset.source, {
                ...asset.info,
                'lynx:main-thread': true,
              });
            },
          );
        },
      );
    },
  ],

  experiments: {
    layers: true,
    css: true,
  },
};

export default config;
