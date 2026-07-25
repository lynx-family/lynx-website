import type { FC } from 'react';
import extensionWidgetUrl from '@assets/lynxtron/extension-widget.svg';
import { MaskIcon } from './mask-icon';
import styles from './extensible-widget.module.less';
import cls from 'classnames';

/**
 * Decorative graph for the "Natively Extensible" card on the Lynxtron
 * home: platform/language icons plugged into the extension socket art.
 */
export const ExtensibleWidget: FC = () => {
  return (
    <div className={styles['extensible-widget']}>
      <div className={styles['graph']}>
        <img className={styles['bg-img']} src={extensionWidgetUrl} alt="" />
        <div className={cls(styles['icon-slot'], styles['left'])}>
          <MaskIcon variant="windows" className={styles['icon']} />
        </div>
        <div className={cls(styles['icon-slot'], styles['middle'])}>
          <MaskIcon variant="apple" className={styles['icon']} />
        </div>
        <div className={cls(styles['icon-slot'], styles['right'])}>
          <MaskIcon variant="cplus" className={styles['icon']} />
        </div>
      </div>
    </div>
  );
};
