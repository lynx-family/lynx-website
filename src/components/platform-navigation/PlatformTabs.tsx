import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { PlatformIcon } from './PlatformIcon';
import { Platform } from './types';

const PLATFORM_OPTIONS: Array<{
  id: Platform;
  label: string;
}> = [
  {
    id: 'ios',
    label: 'iOS',
  },
  {
    id: 'ios-simulator',
    label: 'iOS Simulator',
  },
  {
    id: 'android',
    label: 'Android',
  },
  {
    id: 'web',
    label: 'Web',
  },
  {
    id: 'macos',
    label: 'macOS',
  },
  {
    id: 'macos-arm64',
    label: 'macOS (arm64)',
  },
  {
    id: 'macos-intel',
    label: 'macOS (x86_64)',
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
  /** Platform this tab represents */
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
    <div className="w-full flex flex-wrap gap-4">
      {options.map((option) => (
        <Card
          key={option.id}
          className={cn(
            'basis-[calc(50%-0.5rem)] max-w-[calc(50%-0.5rem)] flex-grow cursor-pointer transition-colors border-2',
            selected === option.id
              ? 'border-primary bg-primary/10'
              : 'border-muted hover:bg-muted',
          )}
          onClick={() => onSelect(option.id)}
        >
          <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3">
            <PlatformIcon platforms={[option.id]} />
            <Label
              htmlFor={option.id}
              className="cursor-pointer flex items-center gap-2 whitespace-nowrap text-center"
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
 * A radio group interface for showing platform-specific content.
 * Uses a card-based layout with platform icons for platform selection.
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
    if (typeof window === 'undefined') {
      return defaultPlatform;
    }
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
      .filter((part) => part.length > 0)
      .filter((part) => !part.startsWith(`${hashKey}=`));
    const newHashPart = `${hashKey}=${activePlatform}`;
    const newHash =
      hashParts.length > 0
        ? `${hashParts.join(',')},${newHashPart}`
        : newHashPart;

    const newUrl = new URL(window.location.href);
    newUrl.hash = newHash;
    window.history.replaceState(null, '', newUrl);

    return () => {
      const hash = window.location.hash.slice(1);
      const remainingParts = hash
        .split(',')
        .filter((part) => part.length > 0)
        .filter((part) => !part.startsWith(`${hashKey}=`));

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

  // Filter platform options to only show available ones
  const availableOptions = PLATFORM_OPTIONS.filter((option) =>
    availablePlatforms.includes(option.id),
  );

  // Find the active tab content
  const activeTabContent = React.Children.toArray(children).find((child) => {
    return (
      React.isValidElement(child) && child.props.platform === activePlatform
    );
  });

  return (
    <div className={cn('w-full space-y-4', className)}>
      <OptionSelector
        options={availableOptions}
        selected={activePlatform}
        onSelect={setActivePlatform}
      />
      {activeTabContent}
    </div>
  );
};

PlatformTabs.Tab = PlatformTab;
