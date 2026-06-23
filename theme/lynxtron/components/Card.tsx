import type { FC, ReactNode } from 'react';
import MaskIcon from './MaskIcon';

type SmallCardProps = {
  title: ReactNode;
  desc: ReactNode;
  iconVariant: 'lightning' | 'grid' | 'puzzle';
  className?: string;
};

export const SmallCard: FC<SmallCardProps> = ({
  title,
  desc,
  iconVariant,
  className,
}) => {
  return (
    <div className={`ah-card ah-small ${className ?? ''}`}>
      <div className="ah-icon">
        <MaskIcon variant={iconVariant} />
      </div>
      <div className="ah-content">
        <div className="ah-title"> {title} </div>
        <div className="ah-desc"> {desc} </div>
      </div>
    </div>
  );
};

type LargeCardProps = {
  title: ReactNode;
  desc: ReactNode;
  iconVariant: 'lightning' | 'grid' | 'puzzle';
  className?: string;
  children?: ReactNode;
};

export const LargeCard: FC<LargeCardProps> = ({
  title,
  desc,
  iconVariant,
  className,
  children,
}) => {
  return (
    <div className={`ah-card ah-large ${className ?? ''}`}>
      <SmallCard title={title} desc={desc} iconVariant={iconVariant} />

      <div className="ah-large-right">{children}</div>
    </div>
  );
};
