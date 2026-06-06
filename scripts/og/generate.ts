/**
 * Build-time Open Graph image generator.
 *
 *   - one shared cover per subsite/lang → docs/public/og/covers/<lang>/<value>.png
 *   - a unique image per blog post      → docs/public/og/blog/<lang>/<slug>.png
 *
 * Outputs land in docs/public/ so rspress ships them as static assets. Runs via
 * `tsx` (see the `gen:og` script). Generation is incremental: each image gets a
 * `<png>.meta.json` sidecar holding a hash of its inputs; unchanged images are
 * skipped. Bump TEMPLATE_VERSION to force a full regen after layout changes.
 *
 * Usage:  tsx scripts/og/generate.ts [--force]
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

import { OG_COVERS, OG_LANGS } from '../../shared-og-config';
import { renderPng } from './lib';
import { coverTemplate, blogTemplate } from './templates';

/** Bump to invalidate every cached image after a template/layout change. */
const TEMPLATE_VERSION = 'og-v8';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const DOCS = join(REPO_ROOT, 'docs');
const OUT_COVERS = join(DOCS, 'public', 'og', 'covers');
const OUT_BLOG = join(DOCS, 'public', 'og', 'blog');
const AUTHORS_JSON = join(
  REPO_ROOT,
  'src',
  'components',
  'blog-avatar',
  'authors.json',
);

const FORCE = process.argv.includes('--force');

type Author = { id: string; name?: string; name_zh?: string };
let AUTHORS: Author[] = [];
try {
  AUTHORS = JSON.parse(readFileSync(AUTHORS_JSON, 'utf8'));
} catch (err) {
  // Bylines are optional; degrade gracefully rather than failing the build.
  console.warn(
    '[og] authors.json missing or invalid; bylines will be empty',
    err,
  );
}
const authorById = new Map(AUTHORS.map((a) => [a.id, a]));

let written = 0;
let skipped = 0;

/** Hash inputs; skip when the sidecar matches and not forced. */
async function emit(
  outPath: string,
  hashInput: unknown,
  render: () => Promise<Buffer>,
) {
  const hash = createHash('sha1')
    .update(TEMPLATE_VERSION + '\n' + JSON.stringify(hashInput))
    .digest('hex');
  const meta = `${outPath}.meta.json`;
  if (!FORCE && existsSync(outPath) && existsSync(meta)) {
    try {
      if (JSON.parse(readFileSync(meta, 'utf8')).hash === hash) {
        skipped++;
        return;
      }
    } catch {
      /* fall through and regenerate on a corrupt sidecar */
    }
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, await render());
  writeFileSync(meta, JSON.stringify({ hash, version: TEMPLATE_VERSION }));
  written++;
}

// ── Covers ──────────────────────────────────────────────────────
// One shared cover per subsite per language: /og/covers/<lang>/<value>.png.
async function generateCovers() {
  for (const lang of OG_LANGS) {
    for (const cover of OG_COVERS) {
      const out = join(OUT_COVERS, lang, `${cover.value}.png`);
      const description =
        lang === 'zh' ? cover.descriptionZh : cover.description;
      await emit(
        out,
        { lang, label: cover.label, description, gradient: cover.gradient },
        () => renderPng(coverTemplate(cover, lang)),
      );
    }
  }
}

// ── Blog ────────────────────────────────────────────────────────
function authorName(id: string, lang: 'en' | 'zh'): string {
  const a = authorById.get(id);
  if (!a) return id;
  return (lang === 'zh' ? a.name_zh : a.name) || a.name || id;
}

function formatDate(value: unknown, lang: 'en' | 'zh'): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  if (lang === 'zh') return `${y}年${m + 1}月${day}日`;
  const month = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][m];
  return `${month} ${day}, ${y}`;
}

function buildByline(
  frontmatter: Record<string, unknown>,
  lang: 'en' | 'zh',
): string {
  const raw = frontmatter.authors ?? frontmatter.author;
  const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
  const names = ids.slice(0, 3).map((id) => authorName(id, lang));
  const by = names.length
    ? `${lang === 'zh' ? '作者：' : 'By '}${names.join(lang === 'zh' ? '、' : ', ')}`
    : '';
  const date = formatDate(frontmatter.date, lang);
  return [by, date].filter(Boolean).join(' · ');
}

async function generateBlogLang(lang: 'en' | 'zh') {
  const dir = join(DOCS, lang, 'blog');
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.mdx') && f !== 'index.mdx',
  );
  for (const file of files) {
    try {
      const slug = file.replace(/\.mdx$/, '');
      const { data } = matter(readFileSync(join(dir, file), 'utf8'));
      const title = String(data.title ?? slug).trim();
      const byline = buildByline(data, lang);
      const out = join(OUT_BLOG, lang, `${slug}.png`);
      await emit(out, { lang, title, byline }, () =>
        renderPng(blogTemplate({ title, byline }, lang)),
      );
    } catch (err) {
      // Isolate a bad post so it can't block OG generation for the rest.
      console.warn(`[og] skipping ${lang}/blog/${file}:`, err);
    }
  }
}

async function main() {
  await generateCovers();
  await generateBlogLang('en');
  await generateBlogLang('zh');
  console.log(
    `[og] ${written} generated, ${skipped} unchanged → docs/public/og/`,
  );
}

main().catch((err) => {
  console.error('[og] generation failed:', err);
  process.exit(1);
});
