import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const WEB_PLATFORM_STATIC_DIR = path.resolve(
  path.dirname(require.resolve('@lynx-js/web-core/package.json')),
  'dist/client_prod/static',
);
const WEB_PLATFORM_BASE_URL = './__lynx_web__/';
const WEB_PLATFORM_PLACEHOLDER = 'http://lynx-web-core-mocked.localhost/';

const sharedTsRule = {
  test: /\.ts$/,
  exclude: [/node_modules/],
  loader: 'builtin:swc-loader',
  options: { jsc: { parser: { syntax: 'typescript' } } },
  type: 'javascript/auto',
};

function rewriteWebPlatformAsset(
  content: Buffer,
  absolutePath: string,
): Buffer {
  const extname = path.extname(absolutePath).toLowerCase();
  if (!['.css', '.html', '.js', '.mjs'].includes(extname)) {
    return content;
  }

  return Buffer.from(
    content
      .toString('utf-8')
      .replaceAll(WEB_PLATFORM_PLACEHOLDER, WEB_PLATFORM_BASE_URL),
    'utf-8',
  );
}

function copyDirectoryRecursive(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    const content = fs.readFileSync(sourcePath);
    fs.writeFileSync(targetPath, rewriteWebPlatformAsset(content, sourcePath));
  }
}

class CopyWebPlatformAssetsPlugin {
  apply(compiler: any) {
    compiler.hooks.afterEmit.tap('CopyWebPlatformAssetsPlugin', () => {
      const targetDir = path.resolve(__dirname, 'dist/web/__lynx_web__/static');
      copyDirectoryRecursive(WEB_PLATFORM_STATIC_DIR, targetDir);
    });
  }
}

const desktopConfig = defineConfig({
  target: 'electron-main',
  entry: {
    main: './src/main/desktop/main.ts',
    preload: './src/main/desktop/preload.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/desktop/'),
    filename: '[name].js',
  },
  module: { rules: [sharedTsRule] },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: './package.json', to: 'package.json' },
        { from: './output/bundle/lynx/', to: '.' },
      ],
    }),
  ],
  resolve: { extensions: ['.ts', '.js'] },
});

const webConfig = defineConfig({
  target: 'web',
  entry: {
    'web-host': './src/main/web/web-host.ts',
    'web-native-modules': {
      import: './src/main/web/native-modules.ts',
      library: {
        type: 'module',
      },
    },
  },
  output: {
    path: path.resolve(__dirname, 'dist/web/'),
    filename: '[name].js',
  },
  module: { rules: [sharedTsRule] },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: './src/main/web/index.html', to: 'index.html' },
        { from: './output/bundle/web/', to: '.' },
      ],
    }),
    new CopyWebPlatformAssetsPlugin(),
  ],
  resolve: { extensions: ['.ts', '.js'] },
  devServer: {
    port: 4172,
    historyApiFallback: true,
    proxy: [
      {
        context: (pathname: string) =>
          pathname.endsWith('.bundle') ||
          pathname.endsWith('.map') ||
          pathname.includes('__rspeedy') ||
          pathname.includes('/static/'),
        target: 'http://localhost:5969',
      },
    ],
  },
});

const targets = (process.env.TARGET_ENV ?? 'desktop').split(',');

export default targets.includes('web') ? [webConfig] : [desktopConfig];
