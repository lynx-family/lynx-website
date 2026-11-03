import type { LlmsTxtContext, LlmsTxtSection } from '@rspress/core';
import type { Link, Root, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { encodingForModel } from 'js-tiktoken';

const markdownOptions = { bulletOther: '-' as const, rule: '-' as const };
const encoding = encodingForModel('gpt-4o');

export function indexPrefix(
  lang: string,
  version: string,
  defaultLang: string,
  defaultVersion: string,
) {
  return `${version && version !== defaultVersion ? `${version}/` : ''}${lang && lang !== defaultLang ? `${lang}/` : ''}`;
}

function visitLinks(node: Root | RootContent, visit: (link: Link) => void) {
  if (node.type === 'link') visit(node);
  if ('children' in node) {
    for (const child of node.children) visitLinks(child as RootContent, visit);
  }
}

function absoluteLink(link: string, base: string, origin: string) {
  if (!link.startsWith('/') || link.startsWith('//')) return link;
  const basePrefix = base.replace(/^\/+|\/+$/g, '');
  return `${origin.replace(/\/$/, '')}${basePrefix ? `/${basePrefix}` : ''}${link}`;
}

function truncateDescriptions(markdown: string) {
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\* \[.*\]\([^)]+\)): (.+)$/);
      if (!match) return line;
      const [, prefix, description] = match;
      const tokens = encoding.encode(description);
      return tokens.length <= 30
        ? line
        : `${prefix}: ${encoding.decode(tokens.slice(0, 29))}…`;
    })
    .join('\n');
}

function sectionNodes(sections: LlmsTxtSection[], depth: 2 | 3): RootContent[] {
  // Preserve Markdown in titles/descriptions, including code, emphasis and
  // type signatures, as in Rspress's default index and the previous plugin.
  return sections.flatMap((section) =>
    section.pages.length === 0
      ? []
      : fromMarkdown(
          `${'#'.repeat(depth)} ${section.title}\n\n` +
            section.pages
              .map(
                (page) =>
                  `- [${page.title}](${page.link})${page.description ? `: ${page.description}` : ''}`,
              )
              .join('\n'),
        ).children,
  );
}

export function renderLynxLlms(
  context: LlmsTxtContext,
  agentsMD: string,
  {
    defaultLang = 'en',
    defaultVersion = '',
    siteOrigin = 'https://lynxjs.org',
  } = {},
) {
  const origin = context.siteOrigin ?? siteOrigin;
  const agents = fromMarkdown(agentsMD);
  const referencedLinks = new Set<string>();
  const versionPrefix =
    context.version && context.version !== defaultVersion
      ? `/${context.version}`
      : '';
  visitLinks(agents, (link) => {
    link.url = absoluteLink(
      link.url,
      `${context.base.replace(/\/$/, '')}${versionPrefix}`,
      origin,
    );
    referencedLinks.add(link.url);
  });

  const sections = context.sections.map((section) => ({
    ...section,
    pages: section.pages.map((page) => ({
      ...page,
      // Rspress has already included the base and locale in page.link.
      link: absoluteLink(page.link, '/', origin),
    })),
  }));
  const isApi = (section: LlmsTxtSection) => /^(API|APIs)$/.test(section.title);
  const apiSections = sections.filter(isApi);
  const appendix = sections
    .filter((section) => !isApi(section))
    .map((section) => ({
      ...section,
      pages: section.pages.filter((page) => {
        const path = page.routePath;
        return (
          !referencedLinks.has(page.link) &&
          !/\/guide\/(devtool|performance|embed|spec)/.test(path) &&
          !/\/(ai|lynx-ui)\//.test(path)
        );
      }),
    }));
  const apiIndex = apiSections.length
    ? toMarkdown(
        {
          type: 'root',
          children: [
            ...fromMarkdown(
              '# Lynx APIs\n\nBelow is a full list of available APIs of Lynx:',
            ).children,
            ...sectionNodes(apiSections, 2),
          ],
        },
        markdownOptions,
      )
    : undefined;
  const apiLink = absoluteLink(
    `/${indexPrefix(context.lang, context.version, defaultLang, defaultVersion)}api/llms.txt`,
    context.base,
    origin,
  );
  return {
    llmsTxt:
      toMarkdown(agents, markdownOptions) +
      '---\n\n## 98. Appendix: Links\n\nYou may find more information about Lynx and related resources in the links below:\n\n' +
      truncateDescriptions(
        toMarkdown(
          { type: 'root', children: sectionNodes(appendix, 3) },
          markdownOptions,
        ),
      ) +
      (apiIndex
        ? `\n\n## 99. Appendix: Lynx APIs\n\nIf you need the full list of all APIs of Lynx, please refer to the [Lynx APIs](${apiLink}).\n`
        : ''),
    apiIndex,
  };
}
