import styles from './NextSteps.module.scss';

interface NextStepsProps {
  children?: React.ReactNode;
}

const NextSteps = (props: NextStepsProps) => {
  return (
    <div className={`${styles.nextSteps} next-steps`}>{props.children}</div>
  );
};

export { NextSteps };
export type { NextStepsProps };
