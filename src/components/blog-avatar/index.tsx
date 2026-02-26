import IconX from '@assets/x-logo.svg?react';
import {
  IconGithubLogo,
  IconGitlabLogo,
  IconTiktokLogo,
  IconUserCircle,
} from '@douyinfe/semi-icons';
import { Avatar } from '@douyinfe/semi-ui';
import { useLang } from '@rspress/core/runtime';
import { useMemo } from 'react';
import originListData from './authors.json';
import styles from './index.module.less';

const brandSpList = {
  github: {
    icon: <IconGithubLogo />,
  },
  x: {
    icon: <IconX className={styles['icon-x']} />,
  },
  tiktok: {
    icon: <IconTiktokLogo />,
  },
  gitlab: {
    icon: <IconGitlabLogo />,
  },
  default: {
    icon: <IconUserCircle />,
  },
} as const;

type BrandKey = keyof typeof brandSpList;

const HoverCard = ({ author }: { author: (typeof originListData)[0] }) => {
  const lang = useLang();

  return (
    <span className={styles['avatar-item']}>
      <img
        className={styles['avatar-img']}
        src={author?.image}
        alt={author.name}
      />
      <div className={styles['avatar-text']}>
        <div className="text-sm leading-none font-medium">
          {lang === 'zh' ? author.name_zh : author.name}
        </div>
        <div className="text-xs leading-none text-[color:var(--text-secondary)]">
          {lang === 'zh' ? author.title_zh : author.title}
        </div>
        <div className={styles['avatar-socials']}>
          {Object.entries(author.socials).map(([key, value]) => {
            return value?.link ? (
              <span
                key={key}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(value?.link, '_blank');
                }}
                className="cursor-pointer"
              >
                {brandSpList[key as BrandKey]
                  ? brandSpList[key as BrandKey].icon
                  : brandSpList['default'].icon}
              </span>
            ) : (
              <span key={key}>
                {brandSpList[key as BrandKey]
                  ? brandSpList[key as BrandKey].icon
                  : brandSpList['default'].icon}
              </span>
            );
          })}
        </div>
      </div>
    </span>
  );
};

const CompactAvatar = ({
  authors,
}: {
  authors: (typeof originListData)[0][];
}) => {
  const lang = useLang();

  return (
    <span className={styles['compact-authors']}>
      <span className={styles['compact-avatars']}>
        {authors.map((author) => (
          <Avatar
            key={author.id}
            className={styles['compact-avatar']}
            src={author?.image}
            size="extra-small"
            // @ts-ignore
            zoom={undefined}
            onMouseEnter={undefined}
            onClick={undefined}
            onMouseLeave={undefined}
          />
        ))}
      </span>
      <span className={styles['compact-names']}>
        {authors.map((a) => (lang === 'zh' ? a.name_zh : a.name)).join(', ')}
      </span>
    </span>
  );
};

const BlogAvatar = ({
  list,
  className,
  compact,
}: {
  list: string[];
  className?: string;
  compact?: boolean;
}) => {
  const filteredAuthors = useMemo(() => {
    // Create a map of authors by id for O(1) lookup
    const authorMap = new Map(
      originListData.map((author) => [author.id, author]),
    );

    // Map the list order to authors, filtering out any invalid ids
    return list
      .map((id) => authorMap.get(id))
      .filter((author): author is (typeof originListData)[0] => author != null);
  }, [list]);

  if (filteredAuthors.length === 0) {
    return <></>;
  }

  if (compact) {
    return (
      <div className={className || ''}>
        <CompactAvatar authors={filteredAuthors} />
      </div>
    );
  }

  return (
    <div className={`${styles['blog-avatar-frame']} ${className || ''}`}>
      {filteredAuthors.map((author) => {
        return <HoverCard author={author} key={author.id} />;
      })}
    </div>
  );
};

export { BlogAvatar };
