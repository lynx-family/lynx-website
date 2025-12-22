import { useLang, usePages } from '@rspress/core/runtime';
import {
  getCustomMDXComponent,
  renderInlineMarkdown,
} from '@rspress/core/theme';
import { BlogAvatar } from '../blog-avatar';
import React from 'react';

type BlogItem = {
  title?: string;
  description?: string;
  date?: Date;
  link?: string;
  authors?: string[];
};

const useBlogPages = (): BlogItem[] => {
  const { pages } = usePages();
  const lang = useLang();

  const blogPages = pages
    .filter((page) => page.lang === lang)
    .filter(
      (page) =>
        page.routePath.includes('/blog/') && !page.routePath.endsWith('/blog/'),
    )
    .sort((a, b) => {
      const dateA = a.frontmatter?.date
        ? new Date(a.frontmatter?.date as string)
        : new Date(0);
      const dateB = b.frontmatter?.date
        ? new Date(b.frontmatter?.date as string)
        : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

  return blogPages.map(
    ({ frontmatter: { description, date, authors }, routePath, title }) => {
      const itemDate = date ? new Date(date as string) : undefined;
      return {
        date: itemDate,
        description,
        link: routePath,
        title: title,
        authors: authors as string[] | undefined,
      };
    },
  );
};

export function BlogList() {
  const { h2: H2, p: P, a: A, hr: Hr } = getCustomMDXComponent();

  const blogPages = useBlogPages();
  const lang = useLang();

  return (
    <>
      {blogPages.map(({ date, description, link, title, authors }, index) => (
        <React.Fragment key={link || index}>
          {title && (
            <H2>
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
