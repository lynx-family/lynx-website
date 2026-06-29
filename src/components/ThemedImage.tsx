import { useDark } from '@rspress/core/runtime';

export interface ThemedImageProps {
  alt: string;
  lightSrc: string;
  darkSrc?: string;
}

export function ThemedImage({ alt, lightSrc, darkSrc }: ThemedImageProps) {
  const isDark = useDark();
  const src = isDark && darkSrc ? darkSrc : lightSrc;

  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid var(--semi-color-border)',
      }}
    >
      <img src={src} alt={alt} />
    </div>
  );
}
