import extensionWidgetUrl from './assets/extension-widget.svg';
import { FeatureIcon } from './FeatureIcon';
import styles from './extensible-widget.module.less';
import cls from 'classnames';

/**
 * Decorative graph for the "Natively Extensible" card on the Lynxtron
 * home: platform/language icons plugged into the extension socket art.
 */
export const ExtensibleWidget = () => {
  return (
    <div className={styles['extensible-widget']}>
      <div className={styles['graph']}>
        <img className={styles['bg-img']} src={extensionWidgetUrl} alt="" />
        <div className={cls(styles['icon-slot'], styles['left'])}>
          <FeatureIcon variant="windows" className={styles['icon']} />
        </div>
        <div className={cls(styles['icon-slot'], styles['middle'])}>
          <FeatureIcon variant="apple" className={styles['icon']} />
        </div>
        <div className={cls(styles['icon-slot'], styles['right'])}>
          <FeatureIcon variant="cplus" className={styles['icon']} />
        </div>
      </div>
    </div>
  );
};
