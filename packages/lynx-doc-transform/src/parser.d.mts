import type { Program } from 'estree';
import type { Root } from 'mdast';
// Register the MDX nodes returned alongside standard Markdown nodes.
import type {} from 'mdast-util-mdx';

/** An unchanged UTF-16 slice mapping prepared text to the original source. */
export interface SourceSegment {
  start: number;
  end: number;
  originalStart: number;
}

/** Original UTF-16 offsets, excluding delimiters and Markdown containers. */
export interface CodeRange {
  start: number;
  end: number;
  type: 'code' | 'inlineCode';
}

export function prepareDocumentation(content: string): {
  value: string;
  segments: SourceSegment[];
};

/** Parse .md or .mdx without evaluating document code. */
export function parseDocumentation(file: string, content: string): Root;

/** Compile for scope analysis without evaluating document code. */
export function compileDocumentation(file: string, content: string): Program;

export function parseDocumentationCode(
  file: string,
  content: string,
): { tree: Root; ranges: CodeRange[] };
