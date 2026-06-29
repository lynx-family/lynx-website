import React from 'react';
import cls from 'classnames';
import styles from './index.module.less';
import { Button } from '@douyinfe/semi-ui';

export const ActionBtn = ({
  text,
  link,
  size,
}: {
  text: string | React.ReactNode;
  link?: string;
  size: string;
}) => {
  return link ? (
    <a href={link} target="_blank" rel="noreferrer">
      <Button
        theme="outline"
        type="tertiary"
        className={cls(styles['action-btn-frame'], styles[size])}
      >
        {text}
      </Button>
    </a>
  ) : (
    <Button
      style={{
        cursor: 'default',
      }}
      theme="outline"
      type="tertiary"
      className={cls(styles['action-btn-frame'], styles[size])}
    >
      {text}
    </Button>
  );
};
