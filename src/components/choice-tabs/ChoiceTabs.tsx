import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/home-comps/border-beam';
import { PlatformSvg } from '@/components/platform-navigation/PlatformIcon';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import React, { useCallback, useEffect, useState } from 'react';
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
  /** Platform IDs to show as compact inline indicators, e.g. ['ios', 'android'] */
  platforms?: string[];
  tag?: string;
  /**
   * Canonical standalone URL for this tab's content. When set, the SSG-MD
   * output replaces the inline tab body with a link to this URL so each
   * approach gets its own focused .md file in `llms.txt`.
   */
  href?: string;
  children: React.ReactNode;
}

interface ChoiceTabsProps {
  queryKey: string;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

const ChoiceTab = (_props: ChoiceTabProps) => {
  return null;
};

// FIXME: this is a hack for Rspress to update the TOC
let renderCountForTocUpdate = 0;

export const ChoiceTabs = ({
  queryKey,
  defaultValue,
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

  // SSG-MD path: emit a compact bullet list with one link per approach so
  // each tab's content lives in its own focused `.md` file rather than
  // concatenating every approach into a single mega-file.
  if (import.meta.env.SSG_MD) {
    return (
      <ul>
        {tabs.map((tab) => {
          const { value, label, description, href } = tab.props;
          return (
            <li key={value}>
              {href ? (
                <strong>
                  <a href={href}>{label}</a>
                </strong>
              ) : (
                <strong>{label}</strong>
              )}
              {description ? ` — ${description}` : null}
            </li>
          );
        })}
      </ul>
    );
  }

  const defaultTab = defaultValue || tabs[0]?.props.value || '';

  const getValueFromQuery = useCallback(() => {
    if (typeof window === 'undefined') return defaultTab;
    const params = new URLSearchParams(window.location.search);
    const val = params.get(queryKey);
    return tabs.some((t) => t.props.value === val) ? val! : defaultTab;
  }, [defaultTab, queryKey, tabs]);

  const [active, setActive] = useState<string>(getValueFromQuery);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set(queryKey, active);
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.history.replaceState(null, '', url);
    return () => {
      const params = new URLSearchParams(window.location.search);
      params.delete(queryKey);
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState(null, '', url);
    };
  }, [active, queryKey]);

  useEffect(() => {
    const handlePopState = () => {
      const val = getValueFromQuery();
      if (val !== active) setActive(val);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [active, getValueFromQuery]);

  renderCountForTocUpdate++;

  return (
    <>
      <div className={cn('choice-tabs', className)}>
        <div className="choice-tabs__track">
          {tabs.map((tab) => {
            const { value, label, description, icon, platforms, tag } =
              tab.props;
            const isActive = value === active;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActive(value)}
                className={cn(
                  'choice-tabs__card',
                  isActive && 'choice-tabs__card--active',
                )}
              >
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
              </button>
            );
          })}
        </div>
        {tabs.map((tab) => (
          <div
            key={tab.props.value}
            style={{
              display: tab.props.value === active ? 'block' : 'none',
            }}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
      {renderCountForTocUpdate % 2 === 0 ? (
        <h2 style={{ display: 'none' }} />
      ) : null}
    </>
  );
};

ChoiceTabs.Tab = ChoiceTab;
