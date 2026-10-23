import { MDXProvider, useMDXComponents } from '@mdx-js/react';
import { Children, type ComponentProps, type PropsWithChildren } from 'react';

const CHINESE_API_HEADING_TRANSLATIONS: Readonly<Record<string, string>> = {
  'Component API': '组件 API',
  'Supporting Types': '辅助类型',
};

export function ChineseApiHeadings({ children }: PropsWithChildren) {
  const { h2: Heading = 'h2' } = useMDXComponents();

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
