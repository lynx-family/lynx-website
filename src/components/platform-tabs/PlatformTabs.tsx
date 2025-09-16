import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';
import { mapPlatformNameToIconName } from '../api-table/compat-table/headers';

type Platform =
  | 'ios'
  | 'ios-simulator'
  | 'android'
  | 'harmony'
  | 'web'
  | 'windows'
  | 'macos'
  | 'macos-arm64'
  | 'macos-intel'
  | 'reactlynx';

const PLATFORM_OPTIONS: Array<{
  id: Platform;
  label: string;
  iconName: string;
}> = [
  {
    id: 'ios',
    label: 'iOS',
    iconName: mapPlatformNameToIconName('ios'),
  },
  {
    id: 'ios-simulator',
    label: 'iOS Simulator',
    iconName: mapPlatformNameToIconName('ios'),
  },
  {
    id: 'android',
    label: 'Android',
    iconName: mapPlatformNameToIconName('android'),
  },

  {
    id: 'harmony',
    label: 'HarmonyOS',
    iconName: mapPlatformNameToIconName('harmony'),
  },
  {
    id: 'web',
    label: 'Web',
    iconName: mapPlatformNameToIconName('web_lynx'),
  },
  {
    id: 'windows',
    label: 'Windows',
    iconName: 'windows',
  },
  {
    id: 'macos',
    label: 'macOS',
    iconName: mapPlatformNameToIconName('ios'),
  },
  {
    id: 'macos-arm64',
    label: 'macOS (arm64)',
    iconName: mapPlatformNameToIconName('ios'),
  },
  {
    id: 'macos-intel',
    label: 'macOS (x86_64)',
    iconName: mapPlatformNameToIconName('ios'),
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

function OptionSelector({
  options,
  selected,
  onSelect,
}: {
  options: typeof PLATFORM_OPTIONS;
  selected: Platform;
  onSelect: (id: Platform) => void;
}) {
  return (
    <div className="sh-flex sh-flex-wrap sh-gap-4">
      {options.map((option) => (
        <Card
          key={option.id}
          className={cn(
            'sh-flex-1 sh-cursor-pointer sh-transition-colors sh-border-2',
            selected === option.id
              ? 'sh-border-primary sh-bg-primary/10'
              : 'sh-border-muted hover:sh-bg-muted',
          )}
          onClick={() => onSelect(option.id)}
        >
          <CardContent className="sh-pt-4 sh-pb-4 sh-flex sh-flex-col sh-items-center sh-gap-3">
            <div
              className={`icon icon-${option.iconName} sh-bg-current sh-h-8 sh-w-8`}
            />
            <Label
              htmlFor={option.id}
              className="sh-cursor-pointer sh-flex sh-items-center sh-gap-2"
            >
              {option.label}
            </Label>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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

  useEffect(() => {
    // Wait for the component to load
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
      <div className={cn('sh-w-full sh-space-y-4', className)}>
        <OptionSelector
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
