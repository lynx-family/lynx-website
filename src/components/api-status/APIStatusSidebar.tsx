import { cn } from '@/lib/utils';
import { useLang, withBase } from '@rspress/core/runtime';
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '../ui/sidebar';
import { PLATFORM_CONFIG } from './constants';
import {
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  type APIStats,
  type DisplayPlatformName,
} from './types';

// Platform icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const Icon = PLATFORM_CONFIG[platform]?.icon;
  return Icon ? <Icon className={className} /> : null;
};

// Page types
export type PageType = 'search' | 'coverage' | 'categories' | 'recent';

// Page icons
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline
      points="22 7 13.5 15.5 8.5 10.5 2 17"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="16 7 22 7 22 13"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LayersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-8.97 4.08a2 2 0 0 1-1.66 0L2.4 12.5" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

interface APIStatusSidebarProps {
  stats: APIStats;
  selectedPlatforms: DisplayPlatformName[];
  onPlatformsChange: (platforms: DisplayPlatformName[]) => void;
  showClayDetails: boolean;
  onShowClayDetailsChange: (show: boolean) => void;
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

// Help icon
const HelpCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
    <path d="M12 17h.01" strokeLinecap="round" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const APIStatusSidebar: React.FC<APIStatusSidebarProps> = ({
  stats,
  selectedPlatforms,
  onPlatformsChange,
  showClayDetails,
  onShowClayDetailsChange,
  activePage,
  onPageChange,
}) => {
  const { state } = useSidebar();
  const lang = useLang();
  const isCollapsed = state === 'collapsed';

  // Colorblind mode state
  const [isColorblindMode, setIsColorblindMode] = React.useState(false);

  // Toggle colorblind mode class on document root
  React.useEffect(() => {
    if (isColorblindMode) {
      document.documentElement.classList.add('colorblind-mode');
    } else {
      document.documentElement.classList.remove('colorblind-mode');
    }
  }, [isColorblindMode]);

  // Toggle platform selection
  const togglePlatform = (platform: DisplayPlatformName) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        onPlatformsChange(selectedPlatforms.filter((p) => p !== platform));
      }
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  // Toggle between Clay aggregate and Clay detail view
  const toggleClayDetails = () => {
    if (!showClayDetails) {
      // Switching to details: replace aggregate 'clay' with 4 sub-platforms
      const hasClayAggregate = selectedPlatforms.includes('clay');
      const withoutClay = selectedPlatforms.filter((p) => p !== 'clay');
      onPlatformsChange(
        hasClayAggregate
          ? [...withoutClay, ...CLAY_PLATFORMS]
          : withoutClay.length > 0
            ? withoutClay
            : ['web_lynx'],
      );
    } else {
      // Switching to aggregate: replace any Clay sub-platforms with aggregate 'clay'
      const hasAnyClayDetail = selectedPlatforms.some((p) =>
        CLAY_PLATFORMS.includes(p as any),
      );
      const withoutClayDetails = selectedPlatforms.filter(
        (p) => !CLAY_PLATFORMS.includes(p as any),
      );
      onPlatformsChange(
        hasAnyClayDetail
          ? [...withoutClayDetails, 'clay']
          : withoutClayDetails.length > 0
            ? withoutClayDetails
            : ['web_lynx'],
      );
    }
    onShowClayDetailsChange(!showClayDetails);
  };

  // Select all visible platforms
  const selectAll = () => {
    const allVisible: DisplayPlatformName[] = showClayDetails
      ? [...NATIVE_PLATFORMS, ...CLAY_PLATFORMS]
      : [...NATIVE_PLATFORMS, 'clay'];
    onPlatformsChange(allVisible.filter((p) => stats.summary.by_platform[p]));
  };

  // Clear to just the first platform
  const clearSelection = () => {
    onPlatformsChange([NATIVE_PLATFORMS[0]]);
  };

  // Get first selected platform for header display
  const firstSelectedPlatform = selectedPlatforms[0] || 'android';
  const currentPlatformStats = stats.summary.by_platform[firstSelectedPlatform];
  const currentPlatformColors =
    PLATFORM_CONFIG[firstSelectedPlatform]?.colors ||
    PLATFORM_CONFIG.android.colors;

  // Format date
  const updatedDate = new Date(stats.generated_at).toLocaleDateString(
    lang === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric' },
  );

  const pages: {
    id: PageType;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'search', label: 'Search', icon: SearchIcon },
    { id: 'categories', label: 'Categories', icon: LayersIcon },
    { id: 'coverage', label: 'Trend', icon: TrendingUpIcon },
    { id: 'recent', label: 'Recently added', icon: SparklesIcon },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-4 pb-2">
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <div className="flex gap-3 items-center">
              <span className="text-base font-semibold">Lynx API Status</span>
              <span className="font-mono text-xs text-muted-foreground">
                {stats.summary.total_apis.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                APIs
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-medium">
              {selectedPlatforms.length === 1 ? (
                <>
                  <PlatformIcon
                    platform={firstSelectedPlatform}
                    className={cn('h-3 w-3', currentPlatformColors.text)}
                  />
                  <span className={currentPlatformColors.text}>
                    {PLATFORM_CONFIG[firstSelectedPlatform]?.label ||
                      firstSelectedPlatform}{' '}
                    {currentPlatformStats?.coverage_percent}%
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  {selectedPlatforms.length} platforms selected
                </span>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Platform Selector - Multi-Select */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="mb-0">
              Platforms ({selectedPlatforms.length})
            </SidebarGroupLabel>
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={selectAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {NATIVE_PLATFORMS.map((platform) => {
                const ps = stats.summary.by_platform[platform];
                if (!ps) return null;
                const colors =
                  PLATFORM_CONFIG[platform]?.colors ||
                  PLATFORM_CONFIG.android.colors;
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <SidebarMenuItem key={platform}>
                    <SidebarMenuButton
                      isActive={isSelected}
                      onClick={() => togglePlatform(platform)}
                      tooltip={`${PLATFORM_CONFIG[platform]?.label || platform} (${ps.coverage_percent}%)`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? `${colors.border} ${colors.bg}`
                            : 'border-muted-foreground/30',
                        )}
                      >
                        {isSelected && (
                          <svg
                            className={cn('w-3 h-3', colors.text)}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline
                              points="20 6 9 17 4 12"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <PlatformIcon
                        platform={platform}
                        className={cn('h-4 w-4', colors.text)}
                      />
                      <span className="flex-1">
                        {PLATFORM_CONFIG[platform]?.label || platform}
                      </span>
                      <span className={cn('text-xs font-mono', colors.text)}>
                        {ps.coverage_percent}%
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Clay: aggregate or detail view */}
              {!showClayDetails ? (
                <>
                  {/* Aggregate Clay entry */}
                  {(() => {
                    const ps = stats.summary.by_platform['clay'];
                    if (!ps) return null;
                    const colors =
                      PLATFORM_CONFIG['clay']?.colors ||
                      PLATFORM_CONFIG.clay_android.colors;
                    const isSelected = selectedPlatforms.includes('clay');
                    return (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={isSelected}
                          onClick={() => togglePlatform('clay')}
                          tooltip={`Clay (${ps.coverage_percent}%)`}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                              isSelected
                                ? `${colors.border} ${colors.bg}`
                                : 'border-muted-foreground/30',
                            )}
                          >
                            {isSelected && (
                              <svg
                                className={cn('w-3 h-3', colors.text)}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline
                                  points="20 6 9 17 4 12"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <PlatformIcon
                            platform="clay"
                            className={cn('h-4 w-4', colors.text)}
                          />
                          <span className="flex-1">Clay</span>
                          <span
                            className={cn('text-xs font-mono', colors.text)}
                          >
                            {ps.coverage_percent}%
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })()}
                  {/* Expand to details */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleClayDetails}
                      tooltip="Clay Details"
                      className="pl-6"
                    >
                      <svg
                        className="w-3 h-3 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="m9 18 6-6-6-6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-muted-foreground">
                        Clay Details
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <>
                  {/* Clay detail header with collapse */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleClayDetails}
                      tooltip="Clay Summary"
                    >
                      <PlatformIcon
                        platform="clay"
                        className="w-4 h-4 text-primary"
                      />
                      <span className="flex-1 text-primary">Clay</span>
                      <svg
                        className="w-3 h-3 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="m15 18-6-6 6-6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Individual Clay platforms */}
                  {CLAY_PLATFORMS.map((platform) => {
                    const ps = stats.summary.by_platform[platform];
                    if (!ps) return null;
                    const colors =
                      PLATFORM_CONFIG[platform]?.colors ||
                      PLATFORM_CONFIG.clay_android.colors;
                    const isSelected = selectedPlatforms.includes(platform);
                    return (
                      <SidebarMenuItem key={platform}>
                        <SidebarMenuButton
                          isActive={isSelected}
                          onClick={() => togglePlatform(platform)}
                          tooltip={`${PLATFORM_CONFIG[platform]?.label || platform} (${ps.coverage_percent}%)`}
                          className="pl-6"
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                              isSelected
                                ? `${colors.border} ${colors.bg}`
                                : 'border-muted-foreground/30',
                            )}
                          >
                            {isSelected && (
                              <svg
                                className={cn('w-3 h-3', colors.text)}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <polyline
                                  points="20 6 9 17 4 12"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <PlatformIcon
                            platform={platform}
                            className={cn('h-4 w-4', colors.text)}
                          />
                          <span className="flex-1">
                            {PLATFORM_CONFIG[platform]?.label || platform}
                          </span>
                          <span
                            className={cn('text-xs font-mono', colors.text)}
                          >
                            {ps.coverage_percent}%
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Page Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pages.map((page) => (
                <SidebarMenuItem key={page.id}>
                  <SidebarMenuButton
                    isActive={activePage === page.id}
                    onClick={() => onPageChange(page.id)}
                    tooltip={page.label}
                  >
                    <page.icon className="w-4 h-4" />
                    <span>{page.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsColorblindMode(!isColorblindMode)}
              tooltip="Colorblind Mode"
              className={cn(
                'h-8 text-muted-foreground hover:text-foreground',
                isColorblindMode && 'text-primary bg-sidebar-accent',
              )}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-2 items-center">
                  <EyeIcon className="w-4 h-4" />
                  <span>Colorblind Mode</span>
                </div>
                {!isCollapsed && isColorblindMode && (
                  <span className="text-[10px] font-mono text-primary font-medium">
                    ON
                  </span>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help"
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <a
                href={withBase(
                  lang === 'zh' ? '/zh/help/dashboard' : '/help/dashboard',
                )}
                className="flex justify-between items-center w-full"
              >
                <div className="flex gap-2 items-center">
                  <HelpCircleIcon className="w-4 h-4" />
                  <span>Help</span>
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    {updatedDate}
                  </span>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default APIStatusSidebar;
