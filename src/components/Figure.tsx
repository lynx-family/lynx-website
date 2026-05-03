import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';

export interface FigureProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'height' | 'width'
> {
  src: string;
  alt: string;
  /** Max height in pixels. */
  height?: number;
  /** Max width in pixels or CSS value. Defaults to `'100%'`. */
  width?: number | string;
  /** Optional caption rendered below the image. */
  caption?: ReactNode;
  /** Container className for layout overrides. */
  className?: string;
  /** Container style for layout overrides. */
  containerStyle?: CSSProperties;
}

export const Figure = ({
  src,
  alt,
  height,
  width = '100%',
  caption,
  className,
  containerStyle,
  style,
  ...rest
}: FigureProps) => {
  return (
    <figure
      className={className}
      style={{
        margin: '16px 0',
        ...containerStyle,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          maxHeight: height,
          maxWidth: width,
          height: 'auto',
          width: 'auto',
          ...style,
        }}
        {...rest}
      />
      {caption && (
        <figcaption
          style={{
            marginTop: 8,
            fontSize: 14,
            color: 'var(--color-text-secondary, #666)',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
