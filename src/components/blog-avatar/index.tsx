import IconX from '@assets/x-logo.svg?react';
import IconBsky from '@assets/bsky-logo.svg?react';
import {
  IconGithubLogo,
  IconGitlabLogo,
  IconTiktokLogo,
  IconUserCircle,
} from '@douyinfe/semi-icons';
import { Avatar, Space } from '@douyinfe/semi-ui';
import { useMemo } from 'react';
import { useLang } from '@rspress/core/runtime';
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
  bsky: {
    icon: <IconBsky />,
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
          className="!sh-pointer-events-none"
          src={author?.image}
          zoom={false}
          onMouseEnter={undefined}
          onClick={undefined}
          onMouseLeave={undefined}
        ></Avatar>
        <div>
          <div className="sh-text-sm sh-font-bold">
            {lang === 'zh' ? author.name_zh : author.name}
          </div>
          <div className="sh-text-xs sh-leading-[1em] sh-mx-0 sh-my-1 text-[color:var(--text-secondary)]">
            {lang === 'zh' ? author.title_zh : author.title}
          </div>
          <div>
            <Space>
              {Object.entries(author.socials).map(([key, value]) => {
                return value?.link ? (
                  <span
                    onClick={() => window.open(value?.link, '_blank')}
                    className="sh-cursor-pointer"
                  >
                    {brandSpList[key as BrandKey]
                      ? brandSpList[key as BrandKey].icon
                      : brandSpList['default'].icon}
                  </span>
                ) : (
                  <>
                    {brandSpList[key as BrandKey]
                      ? brandSpList[key as BrandKey].icon
                      : brandSpList['default'].icon}
                  </>
                );
              })}
            </Space>
          </div>
        </div>
      </Space>
    </span>
  );
};

const BlogAvatar = ({ list }: { list: string[] }) => {
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
    <div className={styles['blog-avatar-frame']}>
      {filteredAuthors.map((author) => {
        return <HoverCard author={author} key={author.id} />;
      })}
    </div>
  );
};

export { BlogAvatar };
