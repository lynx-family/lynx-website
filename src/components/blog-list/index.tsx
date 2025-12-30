import { useLang } from '@rspress/core/runtime';
import {
  getCustomMDXComponent,
  renderInlineMarkdown,
} from '@rspress/core/theme';
import { useBlogPages } from '@site/src/hooks';
import { BlogAvatar } from '../blog-avatar';
import styles from './index.module.less';

export function BlogList({ limit }: { limit?: number }) {
  const { a: A } = getCustomMDXComponent();
  const blogPages = useBlogPages();
  const lang = useLang();

  // Convert limit to number if it's passed as string
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const pages = limitNum ? blogPages.slice(0, limitNum) : blogPages;

  return (
    <>
      {pages.map(({ date, description, link, title, authors }, index) => (
        <A href={link} key={link || index} className={styles.card}>
          {title && <div className={styles.title}>{title}</div>}
          {date && (
            <span className={styles.date}>
              {new Intl.DateTimeFormat(lang, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }).format(date)}
            </span>
          )}
          {description && (
            <div className={styles.description}>
              <p {...renderInlineMarkdown(description)} style={{ margin: 0 }} />
            </div>
          )}
          {authors && (
            <div className={styles.footer}>
              <BlogAvatar list={authors} className={styles.avatarOverride} />
            </div>
          )}
        </A>
      ))}
    </>
  );
}
