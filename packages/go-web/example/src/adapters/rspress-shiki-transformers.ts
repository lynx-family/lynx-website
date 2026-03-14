/**
 * Standalone replacement for `@rspress/core/shiki-transformers`.
 *
 * Provides `transformerAddLineNumbers` using pure CSS counters
 * instead of depending on rspress internals.
 */
import type { ShikiTransformer } from 'shiki';

export function transformerAddLineNumbers(): ShikiTransformer {
  return {
    name: 'standalone:add-line-numbers',
    pre(node) {
      // Add CSS for line numbers via counter
      this.addClassToHast(node, 'has-line-numbers');
    },
    code(node) {
      // The CSS counter approach handles line numbers via
      // counter-reset on <code> and counter-increment on each .line
      node.properties = {
        ...node.properties,
        style: `counter-reset: line;${(node.properties?.style as string) || ''}`,
      };
    },
    line(node) {
      node.properties = {
        ...node.properties,
        class: `${(node.properties?.class as string) || ''} line`.trim(),
      };
    },
  };
}
