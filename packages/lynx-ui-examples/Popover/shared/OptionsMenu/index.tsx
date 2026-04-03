// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { clsx } from 'clsx';
import './index.css';

interface OptionsMenuProps {
  title?: string;
  description?: string;
  className?: string;

  titleClassName?: string;
  descriptionClassName?: string;

  dividerClassName?: string;

  sectionClassName?: string;
  sectionTitleClassName?: string;

  rowClassName?: string;
  rowLabelClassName?: string;
  rowValueClassName?: string;
}

export function OptionsMenu({
  title = 'Narrative Options',
  description = 'Moments persist. Actions are transient. Tap to close.',
  className,
  titleClassName,
  descriptionClassName,
  dividerClassName,
  sectionClassName,
  sectionTitleClassName,
  rowClassName,
  rowLabelClassName,
  rowValueClassName,
}: OptionsMenuProps) {
  return (
    <view className={clsx('options-menu-panel', className)}>
      <text className={clsx('options-menu-title', titleClassName)}>
        {title}
      </text>
      <text className={clsx('options-menu-desc', descriptionClassName)}>
        {description}
      </text>

      <view className={clsx('options-menu-divider', dividerClassName)} />

      <view className={clsx('options-menu-section', sectionClassName)}>
        <text
          className={clsx('options-menu-section-title', sectionTitleClassName)}
        >
          ACTIONS
        </text>
        <view className={clsx('options-menu-row', rowClassName)}>
          <text className={clsx('options-menu-row-label', rowLabelClassName)}>
            Capture
          </text>
        </view>
        <view className={clsx('options-menu-row', rowClassName)}>
          <text className={clsx('options-menu-row-label', rowLabelClassName)}>
            Reflect
          </text>
        </view>
        <view className={clsx('options-menu-row', rowClassName)}>
          <text className={clsx('options-menu-row-label', rowLabelClassName)}>
            Archive
          </text>
        </view>
      </view>

      <view className={clsx('options-menu-section', sectionClassName)}>
        <text
          className={clsx('options-menu-section-title', sectionTitleClassName)}
        >
          SETTINGS
        </text>
        <view className={clsx('options-menu-row', rowClassName)}>
          <text className={clsx('options-menu-row-label', rowLabelClassName)}>
            Notifications
          </text>
          <text className={clsx('options-menu-row-value', rowValueClassName)}>
            On
          </text>
        </view>
        <view className={clsx('options-menu-row', rowClassName)}>
          <text className={clsx('options-menu-row-label', rowLabelClassName)}>
            Reminders
          </text>
          <text className={clsx('options-menu-row-value', rowValueClassName)}>
            Daily
          </text>
        </view>
      </view>
    </view>
  );
}
