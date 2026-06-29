import { useLang, withBase } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import styles from './Step.module.scss';
import { getLangPrefix } from '../../../shared-route-config';

const Step = (props: { href: string; title: string; description: string }) => {
  return (
    <Link className={styles.step} href={useUrl(props.href)}>
      <p className={styles.title}>
        <span>{props.title}</span>
        <svg
          className={styles.arrow}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </p>
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
