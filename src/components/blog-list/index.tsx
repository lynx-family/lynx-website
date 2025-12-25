import { useLang } from '@rspress/core/runtime';
import {
  getCustomMDXComponent,
  renderInlineMarkdown,
} from '@rspress/core/theme';
import { BlogAvatar } from '../blog-avatar';
import { useBlogPages } from '@site/src/hooks';
import React from 'react';

export function BlogList() {
  const { h2: H2, p: P, a: A, hr: Hr } = getCustomMDXComponent();

  const blogPages = useBlogPages();
  const lang = useLang();

  return (
    <>
      {blogPages.map(({ date, description, link, title, authors }, index) => (
        <React.Fragment key={link || index}>
          {title && (
            <H2 id={link}>
              <A href={link}>{title}</A>
            </H2>
          )}
          {date && (
            // @ts-ignore textAutospace is not in the type definition
            <P style={{ textAutospace: 'normal' }}>
              <em>
                {new Intl.DateTimeFormat(lang, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }).format(date)}
              </em>
            </P>
          )}
          {authors && <BlogAvatar list={authors} />}
          {description && <P {...renderInlineMarkdown(description)} />}
          {index < blogPages.length - 1 && <Hr />}
        </React.Fragment>
      ))}
    </>
  );
}
