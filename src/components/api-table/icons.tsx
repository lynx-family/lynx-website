import yesUrl from './assets/icons/yes.svg';
import noUrl from './assets/icons/no.svg';
import partialUrl from './assets/icons/partial.svg';
import unknownUrl from './assets/icons/unknown.svg';
import noteUrl from './assets/icons/note.svg';
import { cn } from '../../lib/utils';
export { PlatformSvg } from '../platform-navigation/PlatformIcon';

export function SupportIcon({
  level,
  className,
}: {
  level: 'yes' | 'no' | 'partial' | 'unknown';
  className?: string;
}) {
  const src =
    level === 'yes'
      ? yesUrl
      : level === 'no'
        ? noUrl
        : level === 'partial'
          ? partialUrl
          : unknownUrl;
  return (
    <div
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
      }}
      className={cn('icon', className)}
    />
  );
}

export function NoteIcon({ className }: { className?: string }) {
  return (
    <div
      style={{
        maskImage: `url(${noteUrl})`,
        WebkitMaskImage: `url(${noteUrl})`,
      }}
      className={cn('icon', className)}
    />
  );
}
