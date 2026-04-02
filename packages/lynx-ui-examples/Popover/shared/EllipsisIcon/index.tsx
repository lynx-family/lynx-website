// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { clsx } from 'clsx';
import './index.css';

const EllipsisIconPathData = {
  sm: 'M3.75 7.5C2.925 7.5 2.25 8.175 2.25 9C2.25 9.825 2.925 10.5 3.75 10.5C4.575 10.5 5.25 9.825 5.25 9C5.25 8.175 4.575 7.5 3.75 7.5ZM14.25 7.5C13.425 7.5 12.75 8.175 12.75 9C12.75 9.825 13.425 10.5 14.25 10.5C15.075 10.5 15.75 9.825 15.75 9C15.75 8.175 15.075 7.5 14.25 7.5ZM9 7.5C8.175 7.5 7.5 8.175 7.5 9C7.5 9.825 8.175 10.5 9 10.5C9.825 10.5 10.5 9.825 10.5 9C10.5 8.175 9.825 7.5 9 7.5Z',
  md: 'M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z',
};

const EllipsisIconPath = {
  sm: `path("${EllipsisIconPathData.sm}")`, // 18px
  md: `path("${EllipsisIconPathData.md}")`, // 24px
};

interface EllipsisIconProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function EllipsisIcon({ size = 'md', className }: EllipsisIconProps) {
  const internalClassName = `ellipsis-icon-${size}`;

  return (
    <view
      className={clsx(internalClassName, className)}
      style={{ clipPath: EllipsisIconPath[size] }}
    />
  );
}
