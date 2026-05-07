import type {
  CSSProperties,
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
} from 'react';

export type CaptionProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  align?: CSSProperties['textAlign'];
  size?: number;
  tone?: 'secondary' | 'primary';
};

export const Caption = ({
  children,
  align = 'center',
  size = 14,
  tone = 'secondary',
  style,
  ...rest
}: CaptionProps) => {
  return (
    <div
      style={{
        marginTop: '12px',
        fontSize: size,
        textAlign: align,
        color: tone === 'primary' ? 'var(--rp-c-text-2)' : 'var(--rp-c-text-3)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

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
  tone?: 'secondary' | 'primary';
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
  tone = 'secondary',
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
            textAlign: 'center',
            color:
              tone === 'primary' ? 'var(--rp-c-text-2)' : 'var(--rp-c-text-3)',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
