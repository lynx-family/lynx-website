import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import {
  Children,
  type ComponentProps,
  type ElementType,
  type PropsWithChildren,
} from 'react';

const CHINESE_API_HEADING_TRANSLATIONS: Readonly<Record<string, string>> = {
  'Component API': '组件 API',
  'Supporting Types': '辅助类型',
};

export function ChineseApiHeadings({ children }: PropsWithChildren) {
  // MDX's declarations use global JSX. Keep this heading boundary scoped to
  // React and to the props actually forwarded to the inherited h2 renderer.
  const Heading = (useMDXComponents().h2 ?? 'h2') as ElementType<
    ComponentProps<'h2'>
  >;

  function LocalizedH2({
    children: headingChildren,
    ...props
  }: ComponentProps<'h2'>) {
    return (
      <Heading {...props}>
        {Children.map(headingChildren, (child) =>
          typeof child === 'string'
            ? (CHINESE_API_HEADING_TRANSLATIONS[child] ?? child)
            : child,
        )}
      </Heading>
    );
  }

  return <MDXProvider components={{ h2: LocalizedH2 }}>{children}</MDXProvider>;
}
