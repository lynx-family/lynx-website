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
  const displayName = lang === 'zh' ? author.name_zh : author.name;
  const role = lang === 'zh' ? author.title_zh : author.title;

  return (
    <span className={styles['avatar-item']}>
      <img
        className={styles['avatar-img']}
        src={author?.image}
        alt={displayName}
      />
      <div className={styles['avatar-text']}>
        <span className={styles['avatar-name-row']}>
          <span className={styles['avatar-name']}>{displayName}</span>
          <span className={styles['avatar-socials']}>
            {Object.entries(author.socials).map(([key, value]) => {
              const icon = brandSpList[key as BrandKey]
                ? brandSpList[key as BrandKey].icon
                : brandSpList['default'].icon;
              return (
                <span
                  key={key}
                  className={styles['avatar-social-link']}
                  role={value?.link ? 'link' : undefined}
                  onClick={
                    value?.link
                      ? (e) => {
                          e.stopPropagation();
                          window.open(
                            value.link,
                            '_blank',
                            'noopener,noreferrer',
                          );
                        }
                      : undefined
                  }
                >
                  {icon}
                </span>
              );
            })}
          </span>
        </span>
        {role && <span className={styles['avatar-role']}>{role}</span>}
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
