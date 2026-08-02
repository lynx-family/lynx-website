import IconX from '@assets/x-logo.svg?react';
import {
  IconGithubLogo,
  IconGitlabLogo,
  IconTiktokLogo,
  IconUserCircle,
} from '@douyinfe/semi-icons';
import { Avatar, Popover } from '@douyinfe/semi-ui';
import { useLang } from '@rspress/core/runtime';
import { useMemo } from 'react';
import originListData from './authors.json';
import originGroupData from './groups.json';
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
type Author = (typeof originListData)[0];
type Group = (typeof originGroupData)[0];

/** A group renders as a single stacked-avatar entry standing in for its members. */
type Entry =
  | { kind: 'author'; id: string; author: Author }
  | { kind: 'group'; id: string; group: Group; members: Author[] };

/** Number of avatars shown before collapsing the rest into a `+N` bubble. */
const MAX_STACKED_AVATARS = 4;

const getDisplayName = (author: Author, lang: string) =>
  lang === 'zh' ? author.name_zh : author.name;

const HoverCard = ({ author }: { author: Author }) => {
  const lang = useLang();
  const displayName = getDisplayName(author, lang);
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

const StackedAvatars = ({ members }: { members: Author[] }) => {
  const lang = useLang();
  const shown = members.slice(0, MAX_STACKED_AVATARS);
  const overflow = members.length - shown.length;

  return (
    <span className={styles['stacked-avatars']}>
      {shown.map((member) => (
        <Avatar
          key={member.id}
          className={styles['stacked-avatar']}
          src={member.image}
          alt={getDisplayName(member, lang)}
          size="extra-small"
          // @ts-ignore
          zoom={undefined}
          onMouseEnter={undefined}
          onClick={undefined}
          onMouseLeave={undefined}
        />
      ))}
      {overflow > 0 && (
        <span className={styles['stacked-avatar-overflow']}>+{overflow}</span>
      )}
    </span>
  );
};

const GroupMembersCard = ({ members }: { members: Author[] }) => {
  const lang = useLang();

  return (
    <div className={styles['group-members']}>
      <div className={styles['group-members-avatars']}>
        {members.map((member) => (
          <img
            key={member.id}
            className={styles['group-member-img']}
            src={member.image}
            alt={getDisplayName(member, lang)}
          />
        ))}
      </div>
      <div className={styles['group-members-names']}>
        {members.map((member) => getDisplayName(member, lang)).join(', ')}
      </div>
    </div>
  );
};

const GroupCard = ({ group, members }: { group: Group; members: Author[] }) => {
  const lang = useLang();
  const displayName = lang === 'zh' ? group.name_zh : group.name;
  const memberCount =
    lang === 'zh'
      ? `${members.length} 位成员`
      : `${members.length} member${members.length === 1 ? '' : 's'}`;

  return (
    <Popover
      showArrow
      position="top"
      trigger="hover"
      content={<GroupMembersCard members={members} />}
    >
      <span className={styles['avatar-item']}>
        <StackedAvatars members={members} />
        <div className={styles['avatar-text']}>
          <span className={styles['avatar-name-row']}>
            <span className={styles['avatar-name']}>{displayName}</span>
          </span>
          <span className={styles['avatar-role']}>{memberCount}</span>
        </div>
      </span>
    </Popover>
  );
};

const CompactEntry = ({ entry }: { entry: Entry }) => {
  const lang = useLang();

  if (entry.kind === 'group') {
    return (
      <>
        <StackedAvatars members={entry.members} />
        <span className={styles['compact-names']}>
          {lang === 'zh' ? entry.group.name_zh : entry.group.name}
        </span>
      </>
    );
  }

  return (
    <>
      <StackedAvatars members={[entry.author]} />
      <span className={styles['compact-names']}>
        {getDisplayName(entry.author, lang)}
      </span>
    </>
  );
};

const CompactAvatar = ({ entries }: { entries: Entry[] }) => {
  const lang = useLang();

  // A lone group keeps the group's own label; a mixed/plain list stacks every
  // avatar together and joins the names, matching the previous behavior.
  if (entries.length === 1 && entries[0].kind === 'group') {
    return (
      <span className={styles['compact-authors']}>
        <CompactEntry entry={entries[0]} />
      </span>
    );
  }

  const authors = entries.flatMap((entry) =>
    entry.kind === 'group' ? entry.members : [entry.author],
  );

  return (
    <span className={styles['compact-authors']}>
      <StackedAvatars members={authors} />
      <span className={styles['compact-names']}>
        {entries
          .map((entry) =>
            entry.kind === 'group'
              ? lang === 'zh'
                ? entry.group.name_zh
                : entry.group.name
              : getDisplayName(entry.author, lang),
          )
          .join(', ')}
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
  const lang = useLang();

  const entries = useMemo<Entry[]>(() => {
    // Create maps by id for O(1) lookup
    const authorMap = new Map(
      originListData.map((author) => [author.id, author]),
    );
    const groupMap = new Map(originGroupData.map((group) => [group.id, group]));

    const collator = new Intl.Collator(lang);
    const sortMembers = (members: Author[]) =>
      [...members].sort((a, b) =>
        collator.compare(getDisplayName(a, lang), getDisplayName(b, lang)),
      );

    // Map the list order to authors/groups, filtering out any invalid ids
    return list
      .map((id): Entry | null => {
        const author = authorMap.get(id);
        if (author) {
          return { kind: 'author', id, author };
        }

        const group = groupMap.get(id);
        if (group) {
          const members = sortMembers(
            group.members
              .map((memberId) => authorMap.get(memberId))
              .filter((member): member is Author => member != null),
          );
          return members.length > 0
            ? { kind: 'group', id, group, members }
            : null;
        }

        return null;
      })
      .filter((entry): entry is Entry => entry != null);
  }, [list, lang]);

  if (entries.length === 0) {
    return <></>;
  }

  if (compact) {
    return (
      <div className={className || ''}>
        <CompactAvatar entries={entries} />
      </div>
    );
  }

  return (
    <div className={`${styles['blog-avatar-frame']} ${className || ''}`}>
      {entries.map((entry) =>
        entry.kind === 'group' ? (
          <GroupCard
            key={entry.id}
            group={entry.group}
            members={entry.members}
          />
        ) : (
          <HoverCard key={entry.id} author={entry.author} />
        ),
      )}
    </div>
  );
};

export { BlogAvatar };
