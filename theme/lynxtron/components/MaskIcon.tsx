import type { FC } from 'react';
import './mask-icon.scss';

type MaskIconProps = {
  variant:
    | 'windows'
    | 'apple'
    | 'cplus'
    | 'lightning'
    | 'multiplatform'
    | 'extensible';
  className?: string;
  title?: string;
};

const MaskIcon: FC<MaskIconProps> = ({ variant, className, title }) => {
  return (
    <span
      className={`mask-icon ${variant} ${className ?? ''}`}
      aria-hidden={title ? undefined : true}
      title={title}
    />
  );
};

export default MaskIcon;
