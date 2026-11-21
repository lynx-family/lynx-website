import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/home-comps/border-beam';
import { useQueryState } from 'nuqs';
import { enableHistorySync, NuqsAdapter } from 'nuqs/adapters/react';
import React, { useEffect, useState } from 'react';
import { PlatformIcon } from '../platform/PlatformIcon';
import type * as LCD from '@lynx-js/lynx-compat-data';
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

// Marks a selection until the next frame so newly mounted nested tabs can
// distinguish it from the page's initial anchor navigation.
let selection: { platform: Platform } | null = null;

type IconRef = LCD.PlatformName | string;
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
    iconName: 'macos' as LCD.PlatformName,
  },
  {
    id: 'macos-arm64',
    label: 'macOS (arm64)',
    iconName: 'macos' as LCD.PlatformName,
  },
  {
    id: 'macos-intel',
    label: 'macOS (x86_64)',
    iconName: 'macos' as LCD.PlatformName,
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
    onSelect?: (id: Platform) => void;
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
            onClick={() => onSelect?.(option.id)}
          >
            {isActive && <BorderBeam duration={3} size={2} />}
            {Array.isArray(option.iconName) ? (
              <div className="shared-tabs__card-icons">
                {option.iconName.map((icon, i) => (
                  <PlatformIcon
                    key={`${option.id}-${i}`}
                    platformName={icon}
                    className="shared-tabs__card-icon"
                  />
                ))}
              </div>
            ) : (
              <PlatformIcon
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
const PlatformTabs = (props: PlatformTabsProps) => {
  if (import.meta.env.SSG_MD) {
    // Rspress's Markdown renderer runs effects without a browser.
    return <PlatformTabsContent {...props} />;
  }
  return (
    <NuqsAdapter>
      <PlatformTabsWithQuery {...props} />
    </NuqsAdapter>
  );
};

const PlatformTabsWithQuery = (props: PlatformTabsProps) => {
  const [platformFromQuery, setPlatformFromQuery] = useQueryState(
    props.queryKey,
  );
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Pick up Rspress client navigations that change the query string.
    enableHistorySync();
    setInitialized(true);
  }, []);

  return (
    <PlatformTabsContent
      {...props}
      initialized={initialized}
      platformFromQuery={platformFromQuery}
      onSelect={(platform) => {
        const currentSelection = { platform };
        selection = currentSelection;
        void setPlatformFromQuery(platform);
        requestAnimationFrame(() => {
          if (selection === currentSelection) selection = null;
        });
      }}
    />
  );
};

const PlatformTabsContent = ({
  defaultPlatform = 'ios',
  children,
  className,
  initialized = false,
  platformFromQuery,
  onSelect,
}: PlatformTabsProps & {
  initialized?: boolean;
  platformFromQuery?: string | null;
  onSelect?: (platform: Platform) => void;
}) => {
  const [mountedBySelection] = useState(() => selection !== null);

  // Get available platforms from children
  const availablePlatforms = React.useMemo(
    () =>
      React.Children.toArray(children).reduce<Platform[]>((acc, child) => {
        if (
          React.isValidElement<PlatformTabProps>(child) &&
          child.props.platform
        ) {
          acc.push(child.props.platform);
        }
        return acc;
      }, []),
    [children],
  );
  const fallbackPlatform = availablePlatforms.includes(defaultPlatform)
    ? defaultPlatform
    : availablePlatforms[0];

  const activePlatform =
    availablePlatforms.find((platform) => platform === platformFromQuery) ??
    fallbackPlatform;

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
    // A nested instance revealed by selecting a tab keeps the reader's
    // position instead of jumping to the URL fragment.
    if (!initialized || mountedBySelection) return;
    // Wait for the component to load, then jump to the hash anchor if any.
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(window.location.hash?.slice(1));
      element?.scrollIntoView({ behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialized, mountedBySelection]);

  // Filter platform options to only show available ones
  const availableOptions = PLATFORM_OPTIONS.filter((option) =>
    availablePlatforms.includes(option.id),
  );

  const tabContent = React.Children.toArray(children).map((child) => {
    if (!React.isValidElement<PlatformTabProps>(child)) return null;
    const isActive = child.props.platform === activePlatform;
    // Keep all content for SSR and Markdown exports, then only keep the
    // selected platform mounted so anchor IDs resolve to its headings.
    // Keep panel wrappers stable so Rspress observes headings being replaced,
    // including headings inside containers such as Steps.
    return (
      <div
        key={child.props.platform}
        style={{ display: isActive ? 'block' : 'none' }}
      >
        {!initialized || isActive ? child.props.children : null}
      </div>
    );
  });

  return (
    <div className={cn('w-full space-y-4', className)}>
      <OptionSelector
        ref={trackRef}
        activeCardRef={activeCardRef}
        options={availableOptions}
        selected={activePlatform}
        onSelect={onSelect}
      />
      {tabContent}
    </div>
  );
};

PlatformTabs.Tab = PlatformTab;

export { PlatformTabs };
export type { PlatformTabProps, PlatformTabsProps };
