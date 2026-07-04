import type { CSSProperties, FC } from 'react';

import appleUrl from '@assets/home/home-icon-apple.svg';
import windowsUrl from '@assets/home/windows.svg';
import cplusUrl from '@assets/lynxtron/c+.svg';
import extensibleUrl from '@assets/lynxtron/extensible.svg';
import lightningUrl from '@assets/lynxtron/lightning.svg';
import multiplatformUrl from '@assets/lynxtron/multiplatform.svg';

const MASK_URLS = {
  apple: appleUrl,
  windows: windowsUrl,
  cplus: cplusUrl,
  extensible: extensibleUrl,
  lightning: lightningUrl,
  multiplatform: multiplatformUrl,
};

export type MaskIconVariant = keyof typeof MASK_URLS;

type MaskIconProps = {
  variant: MaskIconVariant;
  className?: string;
  style?: CSSProperties;
};

/**
 * Monochrome icon rendered as a CSS mask filled with `currentColor`,
 * so it can be tinted by the surrounding theme (several of the source
 * SVGs hardcode their stroke color).
 */
export const MaskIcon: FC<MaskIconProps> = ({ variant, className, style }) => {
  const maskImage = `url(${MASK_URLS[variant]})`;
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background: 'currentColor',
        WebkitMaskImage: maskImage,
        maskImage,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
    />
  );
};
