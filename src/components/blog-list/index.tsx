import { useState } from 'react';
import { useLang } from '@rspress/core/runtime';
import { renderInlineMarkdown } from '@rspress/core/theme';
import useIfMobile from '@site/theme/hooks/use-if-mobile';
import { useBlogPages, useTiltEffect } from '@site/src/hooks';
import { toLatestBlogPath } from '@site/src/lib/utils';
import { BlogAvatar } from '../blog-avatar';
import { MeteorsBackground } from '../home-comps/meteors-background';
import { BorderBeam } from '../home-comps/border-beam';
import styles from './index.module.less';

const subtitleText = {
  en: {
    text: 'Release notes and official announcements from the Lynx team. Follow',
    suffix: 'to stay up to date.',
  },
  zh: {
    text: 'Lynx 团队在此发布版本说明和官方公告。关注',
    suffix: '以获取最新动态。',
  },
};

function BlogCard({
  date,
  description,
  link,
  title,
  authors,
  lang,
  variant = 'grid',
}: {
  date?: Date;
  description?: string;
  link?: string;
  title?: string;
  authors?: string[];
  lang: string;
  variant?: 'featured' | 'grid';
}) {
  const isFeatured = variant === 'featured';
  const latestBlogPath = toLatestBlogPath(link);
  const [isBeamActive, setIsBeamActive] = useState(false);

  return (
    <a
      href={latestBlogPath}
      className={`${styles.card} ${isFeatured ? styles.featured : styles.gridItem}`}
      data-tilt-card
      onMouseEnter={() => setIsBeamActive(true)}
      onMouseLeave={() => setIsBeamActive(false)}
      onFocus={() => setIsBeamActive(true)}
      onBlur={() => setIsBeamActive(false)}
    >
      {isBeamActive && (
        <BorderBeam
          className={styles.beam}
          color="#3b82f6"
          size={2}
          duration={3}
        />
      )}
      {date && (
        <span className={styles.date}>
          {new Intl.DateTimeFormat(lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(date)}
        </span>
      )}
      {title && (
        <div className={isFeatured ? styles.featuredTitle : styles.title}>
          {title}
        </div>
      )}
      {description && (
        <div
          className={
            isFeatured ? styles.featuredDescription : styles.description
          }
        >
          <p {...renderInlineMarkdown(description)} style={{ margin: 0 }} />
        </div>
      )}
      {authors && (
        <div className={styles.footer}>
          <BlogAvatar
            list={authors}
            className={styles.avatarOverride}
            compact
          />
        </div>
      )}
    </a>
  );
}

export function BlogList({ limit }: { limit?: number }) {
  const blogPages = useBlogPages();
  const lang = useLang() as 'en' | 'zh';
  const isMobile = useIfMobile();

  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const pages = limitNum ? blogPages.slice(0, limitNum) : blogPages;
  const isEmbedded = !!limitNum;

  // In full page mode: first post is featured, rest go to grid
  const featuredPost = !isEmbedded && pages.length > 0 ? pages[0] : null;
  const gridPosts = !isEmbedded ? pages.slice(1) : pages;

  useTiltEffect('[data-tilt-card]', { isMobile });

  return (
    <div className={styles.blogPage}>
      {!isEmbedded && <MeteorsBackground gridSize={120} meteorCount={3} />}

      {!isEmbedded && (
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {lang === 'zh' ? '博客' : 'Blog'}
          </h1>
          <p className={styles.subtitle}>
            {subtitleText[lang].text}{' '}
            <a
              href="https://x.com/lynxjs_org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.xLink}
            >
              @lynxjs_org
            </a>{' '}
            {subtitleText[lang].suffix}
          </p>
        </header>
      )}

      {featuredPost && (
        <section className={styles.featuredSection}>
          <BlogCard {...featuredPost} lang={lang} variant="featured" />
        </section>
      )}

      {gridPosts.length > 0 && (
        <section className={styles.grid}>
          {gridPosts.map((post, index) => (
            <BlogCard
              key={post.link || index}
              {...post}
              lang={lang}
              variant="grid"
            />
          ))}
        </section>
      )}
    </div>
  );
}
