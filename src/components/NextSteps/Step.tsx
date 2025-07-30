import { useLang, withBase } from 'rspress/runtime';
import { Link } from 'rspress/theme';
import styles from './Step.module.scss';
import { getLangPrefix } from '../../../shared-route-config';

const Step = (props: { href: string; title: string; description: string }) => {
  return (
    <Link className={styles.step} href={useUrl(props.href)}>
      <p className={styles.title}>{props.title}</p>
      <p className={styles.description}>{props.description}</p>
    </Link>
  );
};

export default Step;

function useUrl(url: string) {
  const lang = useLang();
  const langPrefix = getLangPrefix(lang);

  return withBase(`${langPrefix}${url}`);
}
