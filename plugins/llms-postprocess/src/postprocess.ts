import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Options } from 'mdast-util-to-markdown';
import type {
  Parent,
  Node,
  Heading,
  RootContent,
  Root,
  RootContentMap,
} from 'mdast';
import { encodingForModel } from 'js-tiktoken';

const COMMON_TO_MARKDOWN_OPTIONS = {
  bulletOther: '-',
  ruleRepetition: 3,
  rule: '-',
} satisfies Options;

interface H2Segment {
  title: string;
  heading: Heading;
  content: RootContent[];
}

function segmentByH2(root: Parent): Array<H2Segment> {
  const segments = [];
  let currentSegment: RootContent[] | undefined = undefined;

  for (const node of root.children) {
    if (node.type === 'heading' && node.depth === 2) {
      if (currentSegment && currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [node];
    } else {
      if (currentSegment) {
        currentSegment.push(node);
      }
    }
  }

  if (currentSegment && currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments.map((segment) => {
    const [heading, ...rest] = segment as [Heading, ...RootContent[]];
    const title = toMarkdown(
      {
        type: 'root',
        children: heading.children,
      },
      COMMON_TO_MARKDOWN_OPTIONS,
    ).trim();

    return {
      title,
      heading, // need this to generate markdown back later
      content: rest,
    };
  });
}

function forEachType<T extends keyof RootContentMap>(
  type: T,
  node: Node,
  cb: (nodeWithType: RootContentMap[T], parent?: Parent) => void,
  parent?: Parent,
) {
  if (node.type === type) {
    cb(node as RootContentMap[T], parent);
  } else if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      forEachType(type, child, cb, node as Parent);
    }
  }
}

const enc = encodingForModel('gpt-4o');

function truncateLongDescriptions(markdown: string, maxTokens: number): string {
  const ellipsis = '…';
  const ellipsisTokens = enc.encode(ellipsis).length;
  return markdown
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\* \[[^\]]*\]\([^)]+\)): (.+)$/);
      if (!match) return line;
      const [, prefix, desc] = match;
      const tokens = enc.encode(desc);
      if (tokens.length <= maxTokens) return line;
      const truncatedTokens = tokens.slice(0, maxTokens - ellipsisTokens);
      const truncated = enc.decode(truncatedTokens);
      return `${prefix}: ${truncated}${ellipsis}`;
    })
    .join('\n');
}

/**
 * Postprocess llms.txt
 * @param prefix The prefix for the links, like: https://lynxjs.org
 * @param base The base URL for the links, like: /next, /3.5
 * @param markdown The markdown content to process
 * @param agentsMD The agents markdown content
 * @returns A record mapping paths to their processed content
 */
function postprocessLLMs(
  prefix: string,
  base: string,
  markdown: string,
  agentsMD: string,
): Record<string, string> {
  // remove trailing slash if any
  prefix = prefix.replace(/\/$/, '');
  if (base === '/') {
    base = '';
  }
  if (base !== '') {
    // remove trailing slash if any
    base = base.replace(/\/$/, '');
    // add leading slash if missing
    base = base.startsWith('/') ? base : `/${base}`;
  }

  const root = fromMarkdown(markdown);

  let segments = segmentByH2(root);

  const llmsTxtByPath: Record<string, string> = {};

  segments = segments.filter((segment) => {
    const { title } = segment;
    if (title === 'API' || title === 'APIs') {
      const root = {
        type: 'root',
        children: [
          ...fromMarkdown(`\
# Lynx APIs

Below is a full list of available APIs of Lynx:
`).children,
          segment.heading,
          ...segment.content,
        ],
      } satisfies Root;

      // to abs path
      forEachType('link', root, (link) => {
        link.url = `${prefix}${link.url}`;
      });

      llmsTxtByPath['/api/llms.txt'] = toMarkdown(
        root,
        COMMON_TO_MARKDOWN_OPTIONS,
      );

      return false;
    }

    return true;
  });

  const linksRefedInAgentsMD: Set<string> = new Set();

  forEachType('link', fromMarkdown(agentsMD), (link) => {
    linksRefedInAgentsMD.add(link.url);
  });

  const appendixSectionAst = {
    type: 'root',
    children: segments.flatMap((segment) => [
      {
        ...segment.heading,
        depth: 3,
      },
      ...segment.content,
    ]),
  } satisfies Root;

  // filter unwanted links
  forEachType('link', appendixSectionAst, (link, parent) => {
    // Normalize: “/3.4/x/y.md” -> “/x/y.md”
    const url = link.url.replace(/^\/(?:next|\d+(?:\.\d+)*)?/, '');
    if (
      parent &&
      (linksRefedInAgentsMD.has(url) ||
        // This is a trade-off:
        // We are hiding `/guide/devtool/*` and `/guide/performance/*` from LLM to avoid noise
        link.url.match(/\/guide\/devtool/) ||
        link.url.match(/\/guide\/performance/) ||
        link.url.match(/\/guide\/embed/) ||
        link.url.match(/\/guide\/spec/) ||
        link.url.match(/\/ai\//) ||
        link.url.match(/\/lynx-ui\//))
    ) {
      parent.children = parent.children.filter((child) => child !== link);
    }
  });

  // add prefix (e.g. https://lynxjs.org)
  forEachType('link', appendixSectionAst, (link) => {
    link.url = `${prefix}${link.url}`;
  });

  // filter "empty" list item or list item without any link
  forEachType('listItem', appendixSectionAst, (listItem, parent) => {
    if (parent) {
      const listItemMD = toMarkdown(
        {
          type: 'root',
          children: listItem.children,
        },
        COMMON_TO_MARKDOWN_OPTIONS,
      );

      if (listItemMD.trim() === '') {
        parent.children = parent.children.filter((child) => child !== listItem);
        return;
      }

      let hasLink = false;
      forEachType('link', listItem as unknown as Node, () => {
        hasLink = true;
      });
      if (!hasLink) {
        parent.children = parent.children.filter((child) => child !== listItem);
      }
    }
  });

  const appendixMarkdown = truncateLongDescriptions(
    toMarkdown(appendixSectionAst, COMMON_TO_MARKDOWN_OPTIONS),
    30,
  );

  const appendixSection = `\
---

## 98. Appendix: Links

You may find more information about Lynx and related resources in the links below:

${appendixMarkdown}

## 99. Appendix: Lynx APIs

If you need the full list of all APIs of Lynx, please refer to the [Lynx APIs](${prefix}${base}/api/llms.txt).
`;

  const agentsMDAst = fromMarkdown(agentsMD);

  // to abs path
  forEachType('link', agentsMDAst, (link) => {
    // e.g. https://lynxjs.org/next/x/y.md
    // NOTE: Links from AGENTS.md are always missing version segment
    link.url = `${prefix}${base}${link.url}`;
  });

  llmsTxtByPath['/llms.txt'] =
    toMarkdown(agentsMDAst, COMMON_TO_MARKDOWN_OPTIONS) + appendixSection;

  return llmsTxtByPath;
}

export { postprocessLLMs };
