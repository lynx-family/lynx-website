import styles from './NextSteps.module.scss';

const NextSteps = (props: { children?: React.ReactNode }) => {
  return (
    <div className={`${styles.nextSteps} next-steps`}>{props.children}</div>
  );
};

export default NextSteps;
