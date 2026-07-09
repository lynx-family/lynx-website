import * as fs from 'node:fs';
import * as path from 'node:path';

import { Application, Configuration, TSConfigReader } from 'typedoc';
import type {
  MarkdownApplication,
  PluginOptions,
} from 'typedoc-plugin-markdown';
import { doGenDocData } from './utils/tpl-data.js';
import type { CliOptions } from './command.js';
import { PACKAGES } from './packages/index.js';
import { customize as defaultCustomize } from './themes/default.js';
import type { PackageConfig } from './types/PackageConfig.js';
import { doGenTplWithData } from './utils/tpl.js';

/**
 * This is the base configuration for typedoc-plugin-markdown.
 * @see https://typedoc-plugin-markdown.org/docs/options for explanation of those options.
 * @see https://typedoc-plugin-markdown.org/api-docs/Interface.PluginOptions
 */
const BASE_TYPEDOC_PLUGIN_MARKDOWN_OPTIONS: Partial<PluginOptions> = {
  fileExtension: '.mdx',
  flattenOutputFiles: true,
  entryFileName: 'index',
  mergeReadme: true,
  hidePageHeader: true,
  outputFileStrategy: 'members',
  useCodeBlocks: true,
  expandParameters: true,
  indexFormat: 'table',
  parametersFormat: 'table',
  interfacePropertiesFormat: 'list',
  classPropertiesFormat: 'list',
  // Drop the kind prefix from member page titles ("Function: foo" → "foo").
  // The breadcrumb, URL, and signature already convey the kind.
  textContentMappings: {
    'title.memberPage': '{name}',
  },
};

/**
 * This is the base configuration for typedoc.
 * @see https://typedoc.org/options/ for explanation of those options.
 * @see https://typedoc.org/api/interfaces/Configuration.TypeDocOptions.html#entryPoints
 *
 * @warning Not all TypeDoc options are supported.
 * @see https://typedoc-plugin-markdown.org/docs/typedoc-usage#output-options for compatibility
 */
const BASE_TYPEDOC_OPTIONS: Partial<Configuration.TypeDocOptions> = {
  plugin: ['typedoc-plugin-include-example', 'typedoc-plugin-markdown'],
  requiredToBeDocumented: ['Class', 'Function', 'Interface'],
  // Group members by kind, then alphabetically within a kind. Source-order
  // is unstable across re-exports and produces a random-looking index.
  sort: ['kind', 'alphabetical'],
  blockTags: [
    ...Configuration.OptionDefaults.blockTags,
    '@platform',
    // Going to be deprecated in favor of @platform but kept for suppressing warning.
    '@description',
    '@version',
    '@iOS',
    '@Android',
    '@Harmony',
    '@alias',
    '@a2uiCatalog',
    '@a2uiFunction',
  ],
};

/**
 * The canonical URL of the published docs site. Source READMEs and TSDoc
 * comments hardcode absolute links to this host; we rewrite them to
 * site-relative links so the generated docs stay portable and consistent with
 * the rest of the site (and don't 404 on preview/inhouse deployments).
 */
const SITE_URL = 'https://lynxjs.org';

const TYPEDOC_PLATFORM_TO_BADGE_PLATFORM: Record<string, string> = {
  darwin: 'macos',
  macos: 'macos',
  mas: 'macos',
  win32: 'windows',
  windows: 'windows',
};

/**
 * Rewrites markdown links pointing at the docs site itself
 * (`](https://lynxjs.org/...)`) into site-relative links (`](/...)`), dropping
 * a leading `/zh/` locale segment so links resolve to the reader's current
 * locale via rspress routing. Matches the long-standing hand-maintained
 * convention for these `@generated` files.
 *
 * `/living-spec/...` is intentionally left absolute: it's a static asset
 * (embedded via `<HtmlViewer>` elsewhere), not an rspress route, so a relative
 * link would be flagged as a dead link by the build. External links
 * (react.dev, github.com, ...) are left untouched.
 */
function rewriteSiteLinks(content: string): string {
  return content
    .replace(
      new RegExp(`\\]\\(${SITE_URL}/(?:zh/)?(?!living-spec/)`, 'g'),
      '](/',
    )
    .replace(new RegExp(`\\]\\(${SITE_URL}\\)`, 'g'), '](/)');
}

/**
 * Escapes MDX-breaking curly braces in prose. typedoc-plugin-markdown emits
 * `.mdx` but does not escape `{`/`}`, so brace literals in TSDoc comments
 * (e.g. `{queryFallbacks: true}`) make the MDX/acorn parser fail. We escape
 * braces outside of fenced code, inline code, and the leading JSX comment
 * block at the top of each file, where they are rendered as literal text.
 */
function escapeMdxBraces(content: string): string {
  const lines = content.split('\n');
  let inFence = false;
  let inHeaderComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.includes('{/*')) inHeaderComment = true;
    const skip = inHeaderComment;
    if (line.includes('*/}')) inHeaderComment = false;
    if (skip) continue;
    // Escape only outside inline-code spans (odd-indexed segments are code).
    const parts = line.split('`');
    for (let j = 0; j < parts.length; j += 2) {
      parts[j] = parts[j].replace(/\\?\{/g, '\\{').replace(/\\?\}/g, '\\}');
    }
    lines[i] = parts.join('`');
  }
  return lines.join('\n');
}

function trimTrailingWhitespace(content: string): string {
  return content.replace(/[ \t]+$/gm, '');
}

function escapeMdxTagLiterals(content: string): string {
  const lines = content.split('\n');
  let inFence = false;
  let inHeaderComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.includes('{/*')) inHeaderComment = true;
    const skip = inHeaderComment;
    if (line.includes('*/}')) inHeaderComment = false;
    if (skip) continue;

    const parts = line.split('`');
    for (let j = 0; j < parts.length; j += 2) {
      parts[j] = parts[j].replace(/<([a-z][a-z0-9]*-[a-z0-9-]*)>/g, '`<$1>`');
    }
    lines[i] = parts.join('`');
  }

  return lines.join('\n');
}

const TYPEDOC_META_HEADINGS_HIDDEN_FROM_OUTLINE = new Set([
  'Call Signature',
  'Call Signatures',
  'Defined in',
  'Inherited from',
  'Overrides',
  'Parameters',
  'Returns',
  'Type Parameters',
  '调用签名',
  '定义于',
  '继承于',
  '继承自',
  '参数',
  '返回',
  '类型参数',
  '重写了',
]);

function hideTypeDocMetaHeadingsFromOutline(content: string): string {
  return content.replace(
    /^(#{2,6})\s+(.+?)[ \t]*$/gm,
    (line, _prefix: string, text: string) => {
      return TYPEDOC_META_HEADINGS_HIDDEN_FROM_OUTLINE.has(text)
        ? `**${text}**`
        : line;
    },
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFollowingCodeBlock(lines: string[], startIndex: number) {
  let codeFenceIndex = startIndex + 1;
  while (
    codeFenceIndex < lines.length &&
    /^[ \t]*$/.test(lines[codeFenceIndex])
  ) {
    codeFenceIndex++;
  }

  if (!/^```/.test(lines[codeFenceIndex] ?? '')) return undefined;

  const codeLines: string[] = [];
  for (let i = codeFenceIndex + 1; i < lines.length; i++) {
    if (/^```/.test(lines[i])) return codeLines.join('\n');
    codeLines.push(lines[i]);
  }
  return undefined;
}

function unescapeStringLiteral(value: string): string {
  return value.replace(/\\(["'\\])/g, '$1');
}

type TypeDocSignatureParameter = {
  name: string;
  type: string;
};

type TypeDocSignatureHeading = {
  lineIndex: number;
  headingPrefix: string;
  methodName: string;
  suffix: string;
  parameters: TypeDocSignatureParameter[];
};

function getSignatureParameterList(code: string, methodName: string) {
  const method = escapeRegExp(methodName);
  const methodMatch = new RegExp(`\\b${method}\\s*\\(`).exec(code);
  if (!methodMatch) return undefined;

  const openParenIndex = code.indexOf('(', methodMatch.index);
  let depth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let i = openParenIndex; i < code.length; i++) {
    const char = code[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth++;
      continue;
    }

    if (char === ')') {
      depth--;
      if (depth === 0) return code.slice(openParenIndex + 1, i);
    }
  }

  return undefined;
}

function splitTopLevelParameters(parameters: string): string[] {
  const out: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let i = 0; i < parameters.length; i++) {
    const char = parameters[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === '{') braceDepth++;
    else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (char === '<') angleDepth++;
    else if (char === '>' && angleDepth > 0) angleDepth--;
    else if (
      char === ',' &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      angleDepth === 0
    ) {
      out.push(parameters.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = parameters.slice(start).trim();
  if (last) out.push(last);
  return out;
}

function normalizeSignatureType(type: string): string {
  return unescapeStringLiteral(type.replace(/\s+/g, ' ').trim());
}

function getSignatureParameters(
  code: string,
  methodName: string,
): TypeDocSignatureParameter[] | undefined {
  const parameterList = getSignatureParameterList(code, methodName);
  if (parameterList === undefined) return undefined;

  const parameters: TypeDocSignatureParameter[] = [];
  for (const parameter of splitTopLevelParameters(parameterList)) {
    const match = /^(?:\.\.\.)?([A-Za-z_$][\w$]*)(?:\?)?\s*:\s*(.+)$/.exec(
      parameter,
    );
    if (!match) return undefined;
    parameters.push({
      name: match[1],
      type: normalizeSignatureType(match[2]),
    });
  }

  return parameters;
}

function getDiscriminatorParameterIndex(signatures: TypeDocSignatureHeading[]) {
  const maxParameterCount = Math.max(
    ...signatures.map((signature) => signature.parameters.length),
  );

  for (let i = 0; i < maxParameterCount; i++) {
    const [first, ...rest] = signatures.map((signature) => {
      const parameter = signature.parameters[i];
      return parameter ? `${parameter.name}: ${parameter.type}` : '';
    });
    if (rest.some((value) => value !== first)) return i;
  }

  return undefined;
}

function formatDiscriminatorParameter(parameter: TypeDocSignatureParameter) {
  return `${parameter.name}: ${parameter.type}`;
}

function replaceTypeDocOverloadSignatureHeadings(content: string): string {
  const lines = content.split('\n');
  const headingStack: Array<string | undefined> = [];
  const signatureGroups = new Map<string, TypeDocSignatureHeading[]>();

  for (let i = 0; i < lines.length; i++) {
    const anyHeadingMatch = /^(#{1,6})\s+(.+)$/.exec(lines[i]);
    let parentHeading: string | undefined;
    if (anyHeadingMatch) {
      parentHeading = headingStack
        .slice(0, anyHeadingMatch[1].length - 1)
        .findLast((heading) => heading);
    }

    const headingMatch = /^(#{4,6})\s+([A-Za-z_$][\w$]*)\([^)]*\)(.*)$/.exec(
      lines[i],
    );
    if (headingMatch && parentHeading) {
      const [, headingPrefix, methodName, suffix] = headingMatch;
      const code = getFollowingCodeBlock(lines, i);
      const parameters = code
        ? getSignatureParameters(code, methodName)
        : undefined;

      if (parameters) {
        const groupKey = `${parentHeading}\n${methodName}`;
        const group = signatureGroups.get(groupKey) ?? [];
        group.push({
          lineIndex: i,
          headingPrefix,
          methodName,
          suffix,
          parameters,
        });
        signatureGroups.set(groupKey, group);
      }
    }

    if (anyHeadingMatch) {
      const level = anyHeadingMatch[1].length;
      headingStack[level - 1] = lines[i];
      headingStack.length = level;
    }
  }

  for (const signatures of signatureGroups.values()) {
    if (signatures.length < 2) continue;
    const discriminatorIndex = getDiscriminatorParameterIndex(signatures);
    if (discriminatorIndex === undefined) continue;

    for (const signature of signatures) {
      const parameter = signature.parameters[discriminatorIndex];
      if (!parameter) continue;
      lines[signature.lineIndex] =
        `${signature.headingPrefix} ${formatDiscriminatorParameter(parameter)}${signature.suffix}`;
    }
  }

  return lines.join('\n');
}

type TypeDocPlatformTag = {
  badgePlatforms: string[];
  unknownPlatforms: string[];
};

type TypeDocPlatformTagResult = TypeDocPlatformTag | 'omit';

const COMPLETE_DESKTOP_BADGE_PLATFORMS = new Set(['macos', 'windows']);

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPlatformTagsFromTypeDocPlatformLine(
  line: string,
): TypeDocPlatformTagResult | undefined {
  const tokens = line
    .split(/[,/| ]+/)
    .map((token) => token.trim().replace(/^`|`$/g, '').toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return undefined;

  const badgePlatforms: string[] = [];
  const unknownPlatforms: string[] = [];
  const seenBadgePlatforms = new Set<string>();
  const seenUnknownPlatforms = new Set<string>();

  for (const token of tokens) {
    const platform = TYPEDOC_PLATFORM_TO_BADGE_PLATFORM[token];
    if (platform) {
      if (!seenBadgePlatforms.has(platform)) {
        badgePlatforms.push(platform);
        seenBadgePlatforms.add(platform);
      }
    } else if (!seenUnknownPlatforms.has(token)) {
      unknownPlatforms.push(token);
      seenUnknownPlatforms.add(token);
    }
  }

  if (badgePlatforms.length === 0 && unknownPlatforms.length === 0) {
    return undefined;
  }

  if (
    unknownPlatforms.length === 0 &&
    badgePlatforms.length === COMPLETE_DESKTOP_BADGE_PLATFORMS.size &&
    badgePlatforms.every((platform) =>
      COMPLETE_DESKTOP_BADGE_PLATFORMS.has(platform),
    )
  ) {
    return 'omit';
  }

  return { badgePlatforms, unknownPlatforms };
}

function renderInlinePlatformBadges({
  badgePlatforms,
  unknownPlatforms,
}: TypeDocPlatformTag): string {
  const badges = [
    ...badgePlatforms.map(
      (platform) => `<Lynx.PlatformBadge platform="${platform}" />`,
    ),
    ...unknownPlatforms.map(
      (platform) => `<code>${escapeHtml(platform)}</code>`,
    ),
  ];

  return `<span className="rp-toc-exclude api-platform-badges-inline">${badges.join(' ')}</span>`;
}

function renderBlockPlatformBadges({
  badgePlatforms,
  unknownPlatforms,
}: TypeDocPlatformTag): string {
  return [
    '<div className="inline-flex flex-wrap gap-1">',
    ...badgePlatforms.map(
      (platform) => `  <Lynx.PlatformBadge platform="${platform}" />`,
    ),
    ...unknownPlatforms.map(
      (platform) => `  <code>${escapeHtml(platform)}</code>`,
    ),
    '</div>',
  ].join('\n');
}

function appendInlineContentToHeading(heading: string, inlineContent: string) {
  const customIdMatch = /\s+\{#[^}]+\}$/.exec(heading);
  if (!customIdMatch) {
    return `${heading} ${inlineContent}`;
  }

  return `${heading.slice(0, -customIdMatch[0].length)} ${inlineContent}${
    customIdMatch[0]
  }`;
}

function replaceTypeDocPlatformTagsWithBadges(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const platformHeadingMatch = /^(#{1,6})\s+Platform\s*$/.exec(lines[i]);
    if (!platformHeadingMatch) {
      out.push(lines[i]);
      continue;
    }

    let platformLineIndex = i + 1;
    while (
      platformLineIndex < lines.length &&
      /^[ \t]*$/.test(lines[platformLineIndex])
    ) {
      platformLineIndex++;
    }

    const platformLine = lines[platformLineIndex];
    const platforms =
      platformLine === undefined
        ? undefined
        : getPlatformTagsFromTypeDocPlatformLine(platformLine);
    if (platforms === undefined) {
      out.push(lines[i]);
      continue;
    }

    if (platforms !== 'omit') {
      const platformHeadingLevel = platformHeadingMatch[1].length;
      const parentHeadingPattern = new RegExp(
        `^#{1,${Math.max(1, platformHeadingLevel - 1)}}\\s+[^#]`,
      );
      const insertIndex = out.findLastIndex((line) =>
        parentHeadingPattern.test(line),
      );

      if (insertIndex === -1) {
        out.push('', renderBlockPlatformBadges(platforms));
      } else {
        out[insertIndex] = appendInlineContentToHeading(
          out[insertIndex],
          renderInlinePlatformBadges(platforms),
        );
      }
    }

    i = platformLineIndex;
    if (i + 1 < lines.length && /^[ \t]*$/.test(lines[i + 1])) {
      i++;
    }
  }

  return out.join('\n');
}

type PostProcessGeneratedDocsOptions = {
  platformBadges?: boolean;
};

/**
 * Post-processes generated docs in place: normalize site links and escape
 * MDX-breaking braces so the output builds cleanly and doesn't require manual
 * fixups after each regeneration.
 */
function postProcessGeneratedDocs(
  dir: string,
  options: PostProcessGeneratedDocsOptions = {},
): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      postProcessGeneratedDocs(full, options);
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      const original = fs.readFileSync(full, 'utf8');
      let out = trimTrailingWhitespace(rewriteSiteLinks(original));
      if (entry.name.endsWith('.mdx')) {
        if (options.platformBadges) {
          out = replaceTypeDocPlatformTagsWithBadges(out);
        }
        out = replaceTypeDocOverloadSignatureHeadings(out);
        out = hideTypeDocMetaHeadingsFromOutline(out);
        out = escapeMdxTagLiterals(out);
        out = escapeMdxBraces(out);
      }
      if (out !== original) {
        fs.writeFileSync(full, out);
      }
    }
  }
}

/**
 * Generates TypeDoc documentation for a single package with the specified configuration.
 * This allows us to configure the TypeDoc application for each package and locale individually.
 *
 * @param packageName - Name of the package to generate docs for
 * @param packageConfig - Configuration for the package
 * @param outputRoot - The absolute path to the root output directory
 * @param locale - The locale to generate docs for
 * @returns Promise resolving to the configured TypeDoc application
 */
export async function runTypeDocForPackage(
  packageName: string,
  packageConfig: PackageConfig,
  outputRoot: string,
  locale: string,
  options: Pick<CliOptions, 'platformBadges'> = {},
): Promise<MarkdownApplication> {
  const { tsconfig } = packageConfig;

  const out = packageConfig.out ?? `api/${packageName}`;

  const localeConfig = packageConfig[locale];
  const sharedConfig = packageConfig.shared;

  // Merge entry points from shared and locale-specific configs
  const entryPoints = [
    ...(sharedConfig?.entryPoints ?? []),
    ...(localeConfig?.entryPoints ?? []),
  ];

  if (entryPoints.length === 0) {
    console.warn(
      `Warning: No entry points specified for package "${packageName}"`,
    );
  }

  const app = (await Application.bootstrapWithPlugins(
    {
      name: packageName,
      entryPoints,
      tsconfig,
      lang: locale,
      publicPath: `/${out}`,
      // Merge all options.
      ...BASE_TYPEDOC_OPTIONS,
      ...BASE_TYPEDOC_PLUGIN_MARKDOWN_OPTIONS,
      ...(sharedConfig?.options ?? {}),
      ...(localeConfig?.options ?? {}),
    },
    [new TSConfigReader()],
  )) as MarkdownApplication;

  const absoluteOutputDir = path.join(outputRoot, out);

  // Apply customizations - either package-specific or default
  if (packageConfig.customize) {
    // Package-specific customization
    packageConfig.customize(app, absoluteOutputDir);
  } else {
    // Default to default customization
    defaultCustomize(app, absoluteOutputDir);
  }

  const project = await app.convert();

  if (project) {
    if (packageConfig.generateJson) {
      const jsonGenRootPath = `scripts/typedoc/gen/${locale}`;

      const jsonDir = path.join(
        jsonGenRootPath,
        `./${project.name}`,
        './origin.json',
      );

      await app.generateJson(project, jsonDir);

      await doGenDocData(
        jsonDir,
        path.join(jsonGenRootPath, `./${project.name}`, './data.json'),
      );

      await doGenTplWithData(
        path.join(jsonGenRootPath, `./${project.name}`, './data.json'),
        path.join(jsonGenRootPath, `./${project.name}`, './tpl.mdx'),
      );
    }

    await app.generateDocs(project, absoluteOutputDir);

    // Normalize site links and escape MDX-breaking braces in the output.
    postProcessGeneratedDocs(absoluteOutputDir, {
      platformBadges: options.platformBadges,
    });
  }

  return app;
}

/**
 * Main entry point for TypeDoc documentation generation.
 * Generates documentation for specified packages in both English and Chinese.
 *
 * @param options - CLI options including package selection and working directory
 */
export async function runTypeDoc(options: CliOptions): Promise<void> {
  console.log(Object.entries(PACKAGES));
  console.log(options.packages);
  // Filter packages based on CLI options, or use all packages if none specified
  const packagesToGenerate = options.packages
    ? Object.entries(PACKAGES).filter(
        ([name]) =>
          options.packages?.includes(name) ||
          options.packages?.find((str) => name.startsWith(str)),
      )
    : Object.entries(PACKAGES);

  // Generate documentation for each package in both locales
  for (const [packageName, packageConfig] of packagesToGenerate) {
    await runTypeDocForPackage(
      packageName,
      packageConfig,
      path.join(options.cwd, 'docs/zh/'),
      'zh',
      options,
    );
    await runTypeDocForPackage(
      packageName,
      packageConfig,
      path.join(options.cwd, 'docs/en/'),
      'en',
      options,
    );
  }
}
