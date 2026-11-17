import { NextSteps as Root, type NextStepsProps } from './NextSteps';
import { Step, type StepProps } from './Step';

const NextSteps = { Root, Step } as const;

export { NextSteps };
export type { NextStepsProps, StepProps };
