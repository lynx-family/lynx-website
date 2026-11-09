import type { CSSProperties, FC } from 'react';
import { MaskIcon } from '../../icons/MaskIcon';

import appleUrl from './assets/home-icon-apple.svg';
import windowsUrl from './assets/windows.svg';
import cplusUrl from './assets/c+.svg';
import extensibleUrl from './assets/extensible.svg';
import lightningUrl from './assets/lightning.svg';
import multiplatformUrl from './assets/multiplatform.svg';

const MASK_URLS = {
  apple: appleUrl,
  windows: windowsUrl,
  cplus: cplusUrl,
  extensible: extensibleUrl,
  lightning: lightningUrl,
  multiplatform: multiplatformUrl,
};

export type FeatureIconVariant = keyof typeof MASK_URLS;

type FeatureIconProps = {
  variant: FeatureIconVariant;
  className?: string;
  style?: CSSProperties;
};

/**
 * Monochrome icon rendered as a CSS mask filled with `currentColor`,
 * so it can be tinted by the surrounding theme (several of the source
 * SVGs hardcode their stroke color).
 */
export const FeatureIcon: FC<FeatureIconProps> = ({
  variant,
  className,
  style,
}) => {
  return (
    <MaskIcon src={MASK_URLS[variant]} className={className} style={style} />
  );
};
