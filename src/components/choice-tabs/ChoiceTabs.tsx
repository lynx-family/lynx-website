import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/home-comps/border-beam';
import { PlatformSvg } from '@/components/platform-navigation/PlatformIcon';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import { Link } from '@rspress/core/theme';
import React from 'react';
import './ChoiceTabs.scss';

const PLATFORM_INFO: Record<string, { label: string; icon: PlatformName }> = {
  ios: { label: 'iOS', icon: 'ios' },
  android: { label: 'Android', icon: 'android' },
  harmony: { label: 'HarmonyOS', icon: 'harmony' },
  web: { label: 'Web', icon: 'web_lynx' },
};

interface ChoiceTabProps {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Platform IDs to show as compact inline indicators, e.g. ['ios', 'android']. */
  platforms?: string[];
  tag?: string;
  /** Canonical sibling URL the tab links to when not the active one. */
  href: string;
}

interface ChoiceTabsProps {
  /** `value` of the tab considered active on the current page. */
  active: string;
  children: React.ReactNode;
  className?: string;
}

const ChoiceTab = (_props: ChoiceTabProps) => null;

export const ChoiceTabs = ({
  active,
  children,
  className,
}: ChoiceTabsProps) => {
  const tabs = React.Children.toArray(children).reduce<
    React.ReactElement<ChoiceTabProps>[]
  >((acc, child) => {
    if (React.isValidElement(child) && child.props.value) {
      acc.push(child as React.ReactElement<ChoiceTabProps>);
    }
    return acc;
  }, []);

  return (
    <div className={cn('choice-tabs', className)}>
      <div className="choice-tabs__track">
        {tabs.map((tab) => {
          const { value, label, description, icon, platforms, tag, href } =
            tab.props;
          const isActive = value === active;
          const cardClass = cn(
            'choice-tabs__card',
            isActive && 'choice-tabs__card--active',
          );
          const cardBody = (
            <>
              {isActive && <BorderBeam duration={3} size={2} />}
              <div className="choice-tabs__header">
                {icon && (
                  <span className="choice-tabs__icon-wrap">
                    <span className="choice-tabs__icon">{icon}</span>
                  </span>
                )}
                <div className="choice-tabs__text">
                  <span className="choice-tabs__title-row">
                    <span className="choice-tabs__label">{label}</span>
                    {tag && <span className="choice-tabs__tag">{tag}</span>}
                  </span>
                  {description && (
                    <span className="choice-tabs__desc">{description}</span>
                  )}
                </div>
              </div>
              {platforms && platforms.length > 0 && (
                <span className="choice-tabs__platforms">
                  {platforms.map((p) => {
                    const info = PLATFORM_INFO[p];
                    if (!info) return null;
                    return (
                      <PlatformSvg
                        key={p}
                        platformName={info.icon}
                        className="choice-tabs__platform-icon"
                      />
                    );
                  })}
                </span>
              )}
            </>
          );
          if (isActive) {
            return (
              <span key={value} className={cardClass} aria-current="page">
                {cardBody}
              </span>
            );
          }
          return (
            <Link key={value} href={href} className={cardClass}>
              {cardBody}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

ChoiceTabs.Tab = ChoiceTab;
