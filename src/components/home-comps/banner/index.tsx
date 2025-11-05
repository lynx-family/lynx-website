import { cn } from '@site/src/lib/utils';
import cls from 'classnames';
import React from 'react';
import { useLang } from '@rspress/core/runtime';
import { Button } from '@rspress/core/theme';
import { DotPattern } from './DotPattern';
import styles from './index.module.less';

const desc = {
  zh: '开始用 ',
  en: 'Start building with ',
};

const btnText = {
  zh: '快速开始',
  en: 'Quick Start',
};

const tailText = {
  zh: ' 构建',
  en: '',
};

export const Banner: React.FC = () => {
  const lang = useLang() as 'en' | 'zh';

  return (
    <div className={styles['banner-frame']}>
      <p className={cls(styles['banner-title'], lang === 'zh' && styles.zh)}>
        {desc[lang]} <span className={styles['lynx-text']}>Lynx</span>
        {tailText[lang]}
      </p>
      <Button href={`guide/start/quick-start.html`}>
        {btnText[lang] || btnText['en']}
      </Button>
      <DotPattern
        className={cn(
          '[mask-image:radial-gradient(450px_200px_ellipse_at_center,white,transparent)]',
        )}
      />
    </div>
  );
};
