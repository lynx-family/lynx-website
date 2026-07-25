import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/home-comps/border-beam';
import React, { useCallback, useEffect, useState } from 'react';
import { PlatformSvg } from '../platform-navigation/PlatformIcon';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
import '../shared-tabs.scss';

type Platform =
  | 'ios'
  | 'ios-simulator'
  | 'android'
  | 'harmony'
  | 'web'
  | 'lynxtron'
  | 'desktops'
  | 'node-api'
  | 'windows'
  | 'macos'
  | 'macos-arm64'
  | 'macos-intel'
  | 'reactlynx';

type IconRef = PlatformName | string;
const PLATFORM_OPTIONS: Array<{
  id: Platform;
  label: string;
  iconName: IconRef | IconRef[];
}> = [
  {
    id: 'ios',
    label: 'iOS',
    iconName: 'ios',
  },
  {
    id: 'ios-simulator',
    label: 'iOS Simulator',
    iconName: 'ios',
  },
  {
    id: 'android',
    label: 'Android',
    iconName: 'android',
  },

  {
    id: 'harmony',
    label: 'HarmonyOS',
    iconName: 'harmony',
  },
  {
    id: 'web',
    label: 'Web',
    iconName: 'web_lynx',
  },
  {
    id: 'lynxtron',
    label: 'Lynxtron',
    iconName: 'lynxtron',
  },
  {
    id: 'desktops',
    label: 'Desktop',
    iconName: ['macos', 'windows'],
  },
  {
    id: 'node-api',
    label: 'Desktop (Node-API)',
    iconName: ['macos', 'windows'],
  },
  {
    id: 'windows',
    label: 'Windows',
    iconName: 'windows',
  },
  {
    id: 'macos',
    label: 'macOS',
    iconName: 'macos' as PlatformName,
  },
  {
    id: 'macos-arm64',
    label: 'macOS (arm64)',
    iconName: 'macos' as PlatformName,
  },
  {
    id: 'macos-intel',
    label: 'macOS (x86_64)',
    iconName: 'macos' as PlatformName,
  },
  {
    id: 'reactlynx',
    label: 'ReactLynx',
    iconName: 'reactlynx',
  },
];

/**
 * Props for the PlatformTabs component
 */
interface PlatformTabsProps {
  /** Default platform tab to show. Defaults to 'ios' */
  defaultPlatform?: Platform;
  /** Child components to render within the tabs */
  children: React.ReactNode;
  /** Optional className for styling */
  className?: string;
  /** Key used for storing platform selection in URL query */
  queryKey: string;
}

/**
 * Props for individual platform tab content
 */
interface PlatformTabProps {
  /** Platform this tab represents ('ios', 'android', or 'web') */
  platform: Platform;
  /** Content to render within this tab */
  children: React.ReactNode;
}

/**
 * Component for rendering content for a specific platform tab
 * @example
 * ```tsx
 * <PlatformTabs.Tab platform="ios">
 *   <p>iOS specific content</p>
 * </PlatformTabs.Tab>
 * ```
 */
const PlatformTab = ({ platform, children }: PlatformTabProps) => {
  return <div data-platform={platform}>{children}</div>;
};

const OptionSelector = React.forwardRef<
  HTMLDivElement,
  {
    options: typeof PLATFORM_OPTIONS;
    selected: Platform;
    onSelect: (id: Platform) => void;
    activeCardRef?: React.Ref<HTMLButtonElement>;
  }
>(({ options, selected, onSelect, activeCardRef }, ref) => {
  return (
    <div className="shared-tabs__track" ref={ref}>
      {options.map((option) => {
        const isActive = selected === option.id;
        return (
          <button
            key={option.id}
            ref={isActive ? activeCardRef : undefined}
            type="button"
            className={cn(
              'shared-tabs__card',
              isActive && 'shared-tabs__card--active',
            )}
            onClick={() => onSelect(option.id)}
          >
            {isActive && <BorderBeam duration={3} size={2} />}
            {Array.isArray(option.iconName) ? (
              <div className="shared-tabs__card-icons">
                {option.iconName.map((icon, i) => (
                  <PlatformSvg
                    key={`${option.id}-${i}`}
                    platformName={icon}
                    className="shared-tabs__card-icon"
                  />
                ))}
              </div>
            ) : (
              <PlatformSvg
                platformName={option.iconName}
                className="shared-tabs__card-icon"
              />
            )}
            <span className="shared-tabs__card-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
});

//  FIXME: this is a hack for hook Rspress update the TOC */
let renderCountForTocUpdate = 0;

/**
 * A radio group interface for showing platform-specific content for iOS, Android and Web.
 * Uses a card-based layout with radio buttons for platform selection.
 *
 * @example
 * ```tsx
 * <PlatformTabs defaultPlatform="ios" queryKey="platform-example">
 *   <PlatformTabs.Tab platform="ios">
 *     <p>iOS content</p>
 *   </PlatformTabs.Tab>
 *   <PlatformTabs.Tab platform="android">
 *     <p>Android content</p>
 *   </PlatformTabs.Tab>
 *   <PlatformTabs.Tab platform="web">
 *     <p>Web content</p>
 *   </PlatformTabs.Tab>
 * </PlatformTabs>
 * ```
 */
export const PlatformTabs = ({
  defaultPlatform = 'ios',
  children,
  className,
  queryKey,
}: PlatformTabsProps) => {
  // Get available platforms from children
  const availablePlatforms = React.Children.toArray(children).reduce<
    Platform[]
  >((acc, child) => {
    if (React.isValidElement(child) && child.props.platform) {
      acc.push(child.props.platform as Platform);
    }
    return acc;
  }, []);

  // Get platform from query parameters or use default
  const getPlatformFromQuery = useCallback(() => {
    if (typeof window === 'undefined') {
      return defaultPlatform;
    }
    const searchParams = new URLSearchParams(window.location.search);
    const platformFromQuery = searchParams.get(queryKey);

    return availablePlatforms.includes(platformFromQuery as Platform)
      ? (platformFromQuery as Platform)
      : availablePlatforms.includes(defaultPlatform)
        ? defaultPlatform
        : availablePlatforms[0];
  }, [availablePlatforms, defaultPlatform, queryKey]);

  const [activePlatform, setActivePlatform] = useState<Platform>(
    getPlatformFromQuery(),
  );

  // Update query parameters when platform changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    // Set or update the query parameter
    searchParams.set(queryKey, activePlatform);

    // Use replaceState to update query without page reload
    const newUrl = new URL(window.location.href);
    newUrl.search = searchParams.toString();
    window.history.replaceState(null, '', newUrl);

    // Cleanup query parameter when component unmounts
    return () => {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete(queryKey);

      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = searchParams.toString();
      window.history.replaceState(null, '', cleanUrl);
    };
  }, [activePlatform, queryKey]);

  // Listen for popstate events (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const newPlatform = getPlatformFromQuery();
      if (newPlatform !== activePlatform) {
        setActivePlatform(newPlatform);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePlatform, getPlatformFromQuery]);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const activeCardRef = React.useRef<HTMLButtonElement>(null);

  // Horizontal: center the active tab inside the strip when it overflows.
  useEffect(() => {
    const track = trackRef.current;
    const card = activeCardRef.current;
    if (!track || !card) return;
    if (track.scrollWidth <= track.clientWidth) return;
    track.scrollLeft =
      card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
  }, [activePlatform]);

  useEffect(() => {
    // Wait for the component to load, then jump to the hash anchor if any.
    requestAnimationFrame(() => {
      const element = document.getElementById(window.location.hash?.slice(1));
      element?.scrollIntoView({ behavior: 'auto' });
    });
  }, []);

  // Filter platform options to only show available ones
  const availableOptions = PLATFORM_OPTIONS.filter((option) =>
    availablePlatforms.includes(option.id),
  );

  const tabContent = React.Children.toArray(children).map((child) => {
    if (!React.isValidElement(child)) return null;
    return (
      <div
        key={child.props.platform}
        style={{
          display: child.props.platform === activePlatform ? 'block' : 'none',
        }}
      >
        {child.props.children}
      </div>
    );
  });

  renderCountForTocUpdate++;
  return (
    <>
      <div className={cn('w-full space-y-4', className)}>
        <OptionSelector
          ref={trackRef}
          activeCardRef={activeCardRef}
          options={availableOptions}
          selected={activePlatform}
          onSelect={setActivePlatform}
        />
        {tabContent}
      </div>
      {renderCountForTocUpdate % 2 === 0 ? (
        <h2 style={{ display: 'none' }} />
      ) : null}
    </>
  );
};

PlatformTabs.Tab = PlatformTab;
