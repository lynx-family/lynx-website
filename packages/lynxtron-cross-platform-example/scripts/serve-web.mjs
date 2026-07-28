import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const DEFAULT_PORT = 4173;
const rootArg = process.argv[2] ?? './dist/web';
const rootDir = resolve(process.cwd(), rootArg);
const port = Number(process.env.PORT ?? process.argv[3] ?? DEFAULT_PORT);

const contentTypes = new Map([
  ['.bundle', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
]);

const sharedHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

function isInsideRoot(filePath) {
  return filePath === rootDir || filePath.startsWith(`${rootDir}${sep}`);
}

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(join(rootDir, relativePath));

  if (!isInsideRoot(filePath)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  return null;
}

if (!existsSync(rootDir)) {
  console.error(`[cross-platform-notes] Missing web dist: ${rootDir}`);
  process.exit(1);
}

const server = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, sharedHeaders).end('Bad request');
    return;
  }

  const filePath = resolveRequestPath(req.url);
  if (!filePath) {
    res.writeHead(404, {
      ...sharedHeaders,
      'content-type': 'text/plain; charset=utf-8',
    }).end('Not found');
    return;
  }

  res.writeHead(200, {
    ...sharedHeaders,
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[cross-platform-notes] serving ${rootDir} at http://127.0.0.1:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
