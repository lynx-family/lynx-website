import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';
import { mapPlatformNameToIconName } from '../api-table/compat-table/headers';

type Platform =
  | 'ios'
  | 'ios-simulator'
  | 'android'
  | 'web'
  | 'macos'
  | 'macos-arm64'
  | 'macos-intel';

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
    id: 'web',
    label: 'Web',
    iconName: mapPlatformNameToIconName('web_lynx'),
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
  /** Key used for storing platform selection in URL hash */
  hashKey: string;
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

/**
 * A radio group interface for showing platform-specific content for iOS, Android and Web.
 * Uses a card-based layout with radio buttons for platform selection.
 *
 * @example
 * ```tsx
 * <PlatformTabs defaultPlatform="ios" hashKey="platform-example">
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
  hashKey,
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

  // Get platform from hash or use default
  const getPlatformFromHash = useCallback(() => {
    const hash = window.location.hash.slice(1);
    const hashParts = hash.split(',');
    const platformFromHash = hashParts
      .find((part) => part.startsWith(`${hashKey}=`))
      ?.split('=')[1];

    return availablePlatforms.includes(platformFromHash as Platform)
      ? (platformFromHash as Platform)
      : availablePlatforms.includes(defaultPlatform)
        ? defaultPlatform
        : availablePlatforms[0];
  }, [availablePlatforms, defaultPlatform, hashKey]);

  const [activePlatform, setActivePlatform] = useState<Platform>(
    getPlatformFromHash(),
  );

  // Update hash when platform changes
  useEffect(() => {
    const currentHash = window.location.hash.slice(1);
    const hashParts = currentHash
      .split(',')
      .filter((part) => part.length > 0) // Filter out empty strings
      .filter((part) => !part.startsWith(`${hashKey}=`));
    const newHashPart = `${hashKey}=${activePlatform}`;
    const newHash =
      hashParts.length > 0
        ? `${hashParts.join(',')},${newHashPart}`
        : newHashPart;

    // Use replaceState to update hash without page reload
    const newUrl = new URL(window.location.href);
    newUrl.hash = newHash;
    window.history.replaceState(null, '', newUrl);

    // Cleanup hash when component unmounts
    return () => {
      const hash = window.location.hash.slice(1);
      const remainingParts = hash
        .split(',')
        .filter((part) => part.length > 0) // Filter out empty strings
        .filter((part) => !part.startsWith(`${hashKey}=`));

      // Use replaceState for cleanup too
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = remainingParts.length > 0 ? remainingParts.join(',') : '';
      window.history.replaceState(null, '', cleanUrl);
    };
  }, [activePlatform, hashKey]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newPlatform = getPlatformFromHash();
      if (newPlatform !== activePlatform) {
        setActivePlatform(newPlatform);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activePlatform, getPlatformFromHash]);
  useEffect(() => {
    // wait for the component to load
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
        style={{
          display: child.props.platform === activePlatform ? 'block' : 'none',
        }}
      >
        {child.props.children}
      </div>
    );
  });

  return (
    <div className={cn('sh-w-full sh-space-y-4', className)}>
      <OptionSelector
        options={availableOptions}
        selected={activePlatform}
        onSelect={setActivePlatform}
      />
      {tabContent}
    </div>
  );
};

PlatformTabs.Tab = PlatformTab;
