import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import APITable from '../api-table/APITable';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { PLATFORM_CONFIG } from './constants';
import type { DisplayPlatformName, FeatureInfo } from './types';

export interface APIItemProps {
  query: string;
  name: string;
  category: string;
  selectedPlatforms: DisplayPlatformName[];
  support: FeatureInfo['support'];
  compact?: boolean;
  missing?: boolean;
}

const CATEGORY_SHORT_NAMES: Record<string, string> = {
  'css/properties': 'CSS',
  'css/data-type': 'CSS',
  'css/at-rule': 'CSS',
  elements: 'ELEMENT',
  'lynx-api': 'API',
  'lynx-native-api': 'NATIVE',
  react: 'REACT',
  devtool: 'DEVTOOL',
  errors: 'ERROR',
};

export function APIItem({
  query,
  name,
  category,
  selectedPlatforms,
  support,
  compact = false,
  missing = false,
}: APIItemProps) {
  const isDesktop = useIsDesktop();
  const platformSupportStatus = selectedPlatforms.map((platform) => {
    const versionAdded = support[platform]?.version_added;
    const isSupported =
      !missing &&
      versionAdded !== false &&
      versionAdded !== undefined &&
      versionAdded !== null;
    return { platform, isSupported };
  });
  const supportedCount = platformSupportStatus.filter(
    (p) => p.isSupported,
  ).length;
  const totalSelected = selectedPlatforms.length;
  const allSupported = supportedCount === totalSelected;
  const someSupported = supportedCount > 0 && supportedCount < totalSelected;
  const categoryBadge =
    CATEGORY_SHORT_NAMES[category] ||
    category.split('/').pop()?.toUpperCase() ||
    'API';

  // Preserve nested API paths and avoid using descriptions as names.
  const getDisplayName = () => {
    const pathAfterSlash = query.split('/').pop() || query;
    if (pathAfterSlash.includes('.')) {
      return pathAfterSlash;
    }
    const isDescriptionLike = name && (name.length > 50 || name.includes(' '));
    return isDescriptionLike ? pathAfterSlash : name || pathAfterSlash;
  };
  const displayName = getDisplayName();
  const hasHtmlContent =
    displayName.includes('<code>') || displayName.includes('&lt;');
  const colorClasses = allSupported
    ? 'bg-status-supported/15 text-status-supported-strong border-status-supported/30 hover:bg-status-supported/25'
    : someSupported
      ? 'bg-status-partial/15 text-status-partial-strong border-status-partial/30 hover:bg-status-partial/25'
      : 'bg-status-unsupported/15 text-status-unsupported-strong border-status-unsupported/30 hover:bg-status-unsupported/25';

  return (
    <Drawer direction={isDesktop ? 'right' : undefined}>
      <DrawerTrigger asChild>
        <button
          className={cn(
            'inline-flex flex-col gap-1 rounded-md font-medium transition-all duration-200',
            'border text-left cursor-pointer w-full',
            compact
              ? 'min-h-[36px] py-1.5 px-2.5 text-xs'
              : 'min-h-[40px] py-2 px-3 text-sm',
            colorClasses,
          )}
        >
          <div className="flex items-center gap-1.5 w-full">
            <span
              className={cn(
                'flex-shrink-0 font-semibold tracking-wider uppercase',
                compact ? 'text-[8px]' : 'text-[9px]',
              )}
            >
              {categoryBadge}
            </span>
            {hasHtmlContent ? (
              <span
                className="font-mono break-all leading-tight [&>code]:bg-current/10 [&>code]:px-0.5 [&>code]:rounded flex-1"
                dangerouslySetInnerHTML={{ __html: displayName }}
              />
            ) : (
              <code className="flex-1 font-mono leading-tight break-all">
                {displayName}
              </code>
            )}
            {someSupported && (
              <span className="ml-auto text-[9px] font-mono opacity-80 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 flex-shrink-0">
                {supportedCount}/{totalSelected}
              </span>
            )}
          </div>
          {selectedPlatforms.length > 1 && (
            <div className="flex flex-wrap gap-1 items-center">
              {platformSupportStatus.map(({ platform, isSupported }) => {
                const Icon = PLATFORM_CONFIG[platform]?.icon;
                return (
                  <div
                    key={platform}
                    className={cn(
                      'inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9px]',
                      isSupported
                        ? 'bg-status-supported/20 text-status-supported-strong'
                        : 'bg-status-unsupported/20 text-status-unsupported-strong',
                    )}
                    title={`${PLATFORM_CONFIG[platform]?.label || platform}: ${isSupported ? 'Supported' : 'Not supported'}`}
                  >
                    {Icon && (
                      <Icon className="[--icon-size:var(--api-status-item-icon-size,10px)]" />
                    )}
                    <span
                      className={cn(
                        'inline-block w-1.5 h-1.5 rounded-full',
                        isSupported
                          ? 'bg-status-supported'
                          : 'bg-status-unsupported',
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          !isDesktop && 'max-h-[85vh]',
          isDesktop && 'bg-zinc-50 dark:bg-zinc-900',
        )}
      >
        <div className="flex overflow-hidden flex-col p-5 w-full h-full grow">
          <DrawerHeader className="p-0 mb-4">
            <DrawerTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              <code className="font-mono">{query}</code>
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-auto flex-1 pr-1">
            <APITable query={query} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
