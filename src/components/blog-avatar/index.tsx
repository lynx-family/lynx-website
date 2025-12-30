import IconX from '@assets/x-logo.svg?react';
import {
  IconGithubLogo,
  IconGitlabLogo,
  IconTiktokLogo,
  IconUserCircle,
} from '@douyinfe/semi-icons';
import { Avatar, Space } from '@douyinfe/semi-ui';
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
      <Space>
        <Avatar
          className="!pointer-events-none"
          src={author?.image}
          // @ts-ignore
          zoom={undefined}
          onMouseEnter={undefined}
          onClick={undefined}
          onMouseLeave={undefined}
        ></Avatar>
        <div>
          <div className="text-sm font-bold">
            {lang === 'zh' ? author.name_zh : author.name}
          </div>
          <div className="text-xs leading-[1em] mx-0 my-1 text-[color:var(--text-secondary)]">
            {lang === 'zh' ? author.title_zh : author.title}
          </div>
          <div>
            <Space>
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
            </Space>
          </div>
        </div>
      </Space>
    </span>
  );
};

const BlogAvatar = ({
  list,
  className,
}: {
  list: string[];
  className?: string;
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

  return (
    <div className={`${styles['blog-avatar-frame']} ${className || ''}`}>
      {filteredAuthors.map((author) => {
        return <HoverCard author={author} key={author.id} />;
      })}
    </div>
  );
};

export { BlogAvatar };
