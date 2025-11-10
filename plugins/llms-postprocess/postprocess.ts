import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import type {
  Parent,
  Node,
  Heading,
  RootContent,
  Root,
  RootContentMap,
} from 'mdast';

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
    const title = toMarkdown({
      type: 'root',
      children: heading.children,
    }).trim();

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

function postprocessLLMs(
  markdown: string,
  agentsMD: string,
): Record<string, string> {
  const root = fromMarkdown(markdown);

  let segments = segmentByH2(root);

  const llmsTxtByPath: Record<string, string> = {};

  segments = segments.filter((segment) => {
    const { title } = segment;
    if (title === 'API' || title === 'APIs') {
      llmsTxtByPath['/api/llms.txt'] = toMarkdown({
        type: 'root',
        children: [
          ...fromMarkdown(`\
# Lynx APIs

Below is a full list of available APIs of Lynx:
`).children,
          segment.heading,
          ...segment.content,
        ],
      });

      return false;
    }

    return true;
  });

  const allLynxJsLinks: Set<string> = new Set();
  forEachType('link', fromMarkdown(agentsMD), (link) => {
    allLynxJsLinks.add(link.url);
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
    link.url = `https://lynxjs.org${link.url}`;
    if (
      parent &&
      (allLynxJsLinks.has(link.url) ||
        // This is a trade-off:
        // We are hiding `/guide/devtool/*` and `/guide/performance/*` from AI to avoid noise
        link.url.match(/\/guide\/devtool/) ||
        link.url.match(/\/guide\/performance/))
    ) {
      parent.children = parent.children.filter((child) => child !== link);
    }
  });

  // filter "empty" list item
  forEachType('listItem', appendixSectionAst, (listItem, parent) => {
    if (parent) {
      // Modify the list item as needed
      const listItemMD = toMarkdown({
        type: 'root',
        children: listItem.children,
      });

      if (listItemMD.trim() === '') {
        parent.children = parent.children.filter((child) => child !== listItem);
      }
    }
  });

  const appendixSection = `\
---

## 98. Appendix: Links

You may find more information about Lynx and related resources in the links below:

${toMarkdown(appendixSectionAst)}

## 99. Appendix: Lynx APIs

If you need the full list of all APIs of Lynx, please refer to the [Lynx APIs](https://lynxjs.org/next/api/llms.txt).
`;

  llmsTxtByPath['/llms.txt'] = agentsMD + appendixSection;

  return llmsTxtByPath;
}

export { postprocessLLMs };
