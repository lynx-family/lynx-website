const fs = require('fs');
const path = require('path');

const resolveLynxUiPackagesDir = () => {
  const candidates = ['@lynx-js/lynx-ui-repo'];
  for (const candidate of candidates) {
    try {
      const pkgJsonPath = require.resolve(`${candidate}/package.json`);
      const repoRoot = path.dirname(pkgJsonPath);
      const packagesDir = path.join(repoRoot, 'packages');
      if (fs.existsSync(packagesDir)) {
        return { packagesDir, repoRoot, candidate };
      }
    } catch {
      continue;
    }
  }
  return null;
};

const resolved = resolveLynxUiPackagesDir();
const LYNX_UI_DIR = resolved?.packagesDir;
const SHARED_DOCS_DIR = path.resolve(__dirname, '../sharedDocs/packageDocs');

console.log('🔄 Syncing docs from @lynx-js/lynx-ui to sharedDocs...');

if (!LYNX_UI_DIR || !fs.existsSync(LYNX_UI_DIR)) {
  console.warn(
    '⚠️ Warning: lynx-ui packages directory not found. Skipping docs sync.',
  );
  process.exit(0);
}

if (fs.existsSync(SHARED_DOCS_DIR)) {
  // Clean existing sharedDocs directory
  fs.rmSync(SHARED_DOCS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SHARED_DOCS_DIR, { recursive: true });

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

const collectFilesRecursively = (dir) => {
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFilesRecursively(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
};

const hoistMdxImports = (filePath) => {
  if (!filePath.endsWith('.mdx')) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);

  let inCodeFence = false;
  let contentStarted = false;
  let hasNonTopLevelImports = false;
  const imports = [];
  const body = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      body.push(line);
      continue;
    }

    const isImportExport =
      !inCodeFence && (/^import\s/.test(line) || /^export\s/.test(line));
    if (isImportExport) {
      if (contentStarted) {
        hasNonTopLevelImports = true;
      }
      imports.push(line);
      continue;
    }

    if (!inCodeFence && trimmed.length > 0) {
      contentStarted = true;
    }
    body.push(line);
  }

  if (imports.length === 0) {
    return;
  }

  if (!hasNonTopLevelImports) {
    return;
  }

  const seen = new Set();
  const uniqueImports = imports.filter((l) => {
    if (seen.has(l)) return false;
    seen.add(l);
    return true;
  });

  const bodyText = body.join('\n').replace(/^\n+/, '');
  const next = `${uniqueImports.join('\n')}\n\n${bodyText}`;

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8');
  }
};

const ENABLE_MDX_HOIST = (process.env.LYNX_UI_MDX_HOIST ?? 'true') !== 'false';

let copiedCount = 0;
const packages = fs.readdirSync(LYNX_UI_DIR);

packages.forEach((pkgName) => {
  const pkgDocsDir = path.join(LYNX_UI_DIR, pkgName, 'docs');
  if (fs.existsSync(pkgDocsDir) && fs.statSync(pkgDocsDir).isDirectory()) {
    const targetDir = path.join(SHARED_DOCS_DIR, pkgName);

    // Clean existing target directory if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    copyRecursiveSync(pkgDocsDir, targetDir);
    if (ENABLE_MDX_HOIST) {
      for (const filePath of collectFilesRecursively(targetDir)) {
        hoistMdxImports(filePath);
      }
    }
    copiedCount++;
  }
});

console.log(
  `✅ Successfully synced docs for ${copiedCount} packages to sharedDocs/packageDocs.`,
);
