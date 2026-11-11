import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import styles from './MaskIcon.module.scss';

type MaskIconProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Private, decorative mask renderer. className and style target the glyph
 * element; CSS owns dimensions through --icon-size (default: 1rem).
 */
export function MaskIcon({ src, className, style }: MaskIconProps) {
  const maskImage = `url("${src}")`;
  return (
    <div
      aria-hidden="true"
      className={cn(styles.icon, className)}
      style={{ WebkitMaskImage: maskImage, maskImage, ...style }}
    />
  );
}
