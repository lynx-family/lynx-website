import type { CSSProperties, ImgHTMLAttributes } from 'react';

export interface InlineIconProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'height' | 'width'
> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility — required */
  alt: string;
  /** Icon size in pixels. Applied to both width and height unless `width` is set separately. Defaults to `20`. */
  size?: number;
  /** Override width independently from `size`. */
  width?: number;
  /** Horizontal margin in pixels around the icon. Defaults to `4`. */
  margin?: number;
  /** Vertical alignment relative to surrounding text. Defaults to `'middle'`. */
  verticalAlign?: CSSProperties['verticalAlign'];
}

export const InlineIcon = ({
  src,
  alt,
  size = 24,
  width,
  margin = 4,
  verticalAlign = 'middle',
  style,
  ...rest
}: InlineIconProps) => {
  return (
    <img
      src={src}
      alt={alt}
      style={{
        display: 'inline-block',
        verticalAlign,
        height: size,
        width: width ?? 'auto',
        margin: `0 ${margin}px`,
        ...style,
      }}
      {...rest}
    />
  );
};
