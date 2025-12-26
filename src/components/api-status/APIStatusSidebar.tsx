import { cn } from '@/lib/utils';
import type { PlatformName } from '@lynx-js/lynx-compat-data';
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
import {
  CLAY_PLATFORMS,
  NATIVE_PLATFORMS,
  PLATFORM_DISPLAY_NAMES,
  type APIStats,
} from './types';

// Platform colors
const platformColors: Record<
  string,
  { bg: string; border: string; text: string; progress: string }
> = {
  android: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    progress: 'bg-emerald-500',
  },
  ios: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    progress: 'bg-blue-500',
  },
  harmony: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    progress: 'bg-orange-500',
  },
  web_lynx: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-400',
    progress: 'bg-purple-500',
  },
  clay_android: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500',
    text: 'text-teal-700 dark:text-teal-400',
    progress: 'bg-teal-500',
  },
  clay_ios: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-400',
    progress: 'bg-cyan-500',
  },
  clay_macos: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-400',
    progress: 'bg-indigo-500',
  },
  clay_windows: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500',
    text: 'text-sky-700 dark:text-sky-400',
    progress: 'bg-sky-500',
  },
};

// Platform icons
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({
  platform,
  className,
}) => {
  const ClayIcon = (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
    </svg>
  );
  const icons: Record<string, React.ReactNode> = {
    android: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.532 15.106a1.003 1.003 0 1 1 .001-2.006 1.003 1.003 0 0 1-.001 2.006zm-11.044 0a1.003 1.003 0 1 1 .001-2.006 1.003 1.003 0 0 1-.001 2.006zm11.4-6.018l2.006-3.459a.416.416 0 1 0-.721-.416l-2.032 3.505A12.192 12.192 0 0 0 12.001 7.9a12.19 12.19 0 0 0-5.142.818L4.828 5.213a.416.416 0 1 0-.722.416l2.006 3.461C2.651 11.095.436 14.762.046 18.997h23.909c-.39-4.235-2.606-7.901-6.067-9.909z" />
      </svg>
    ),
    ios: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    harmony: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M6 12h12" />
      </svg>
    ),
    web_lynx: (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    clay_android: ClayIcon,
    clay_ios: ClayIcon,
    clay_macos: ClayIcon,
    clay_windows: ClayIcon,
  };
  return <>{icons[platform] || null}</>;
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
  selectedPlatform: PlatformName;
  onPlatformChange: (platform: PlatformName) => void;
  showClay: boolean;
  onShowClayChange: (show: boolean) => void;
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

// Clock icon
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const APIStatusSidebar: React.FC<APIStatusSidebarProps> = ({
  stats,
  selectedPlatform,
  onPlatformChange,
  showClay,
  onShowClayChange,
  activePage,
  onPageChange,
}) => {
  const { state } = useSidebar();
  const lang = useLang();
  const isCollapsed = state === 'collapsed';

  // Get current platform info for header
  const currentPlatformStats = stats.summary.by_platform[selectedPlatform];
  const currentPlatformColors =
    platformColors[selectedPlatform] || platformColors.android;

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
    { id: 'coverage', label: 'Coverages', icon: TrendingUpIcon },
    { id: 'categories', label: 'Categories', icon: LayersIcon },
    { id: 'recent', label: 'Recently added', icon: SparklesIcon },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
            <svg
              className="h-5 w-5 text-sidebar-accent-foreground"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Lynx API Status</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {stats.summary.total_apis.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">APIs</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ClockIcon className="h-3 w-3" />
                <span>Updated {updatedDate}</span>
                <span className="mx-0.5">·</span>
                <PlatformIcon
                  platform={selectedPlatform}
                  className={cn('h-3 w-3', currentPlatformColors.text)}
                />
                <span className={currentPlatformColors.text}>
                  {PLATFORM_DISPLAY_NAMES[selectedPlatform]}{' '}
                  {currentPlatformStats?.coverage_percent}%
                </span>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Platform Selector */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NATIVE_PLATFORMS.map((platform) => {
                const ps = stats.summary.by_platform[platform];
                if (!ps) return null;
                const colors =
                  platformColors[platform] || platformColors.android;
                const isSelected = selectedPlatform === platform;
                return (
                  <SidebarMenuItem key={platform}>
                    <SidebarMenuButton
                      isActive={isSelected}
                      onClick={() => onPlatformChange(platform)}
                      tooltip={`${PLATFORM_DISPLAY_NAMES[platform]} (${ps.coverage_percent}%)`}
                    >
                      <PlatformIcon
                        platform={platform}
                        className={cn('h-4 w-4', colors.text)}
                      />
                      <span className="flex-1">
                        {PLATFORM_DISPLAY_NAMES[platform]}
                      </span>
                      <span className={cn('text-xs font-mono', colors.text)}>
                        {ps.coverage_percent}%
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Clay Toggle */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onShowClayChange(!showClay)}
                  tooltip="Toggle Clay Platforms"
                >
                  <svg
                    className={cn(
                      'h-4 w-4',
                      showClay ? 'text-primary' : 'text-muted-foreground',
                    )}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
                  </svg>
                  <span className="flex-1">Clay</span>
                  {showClay && (
                    <svg
                      className="h-3 w-3 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline
                        points="20 6 9 17 4 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Clay Platforms (when expanded) */}
              {showClay &&
                CLAY_PLATFORMS.map((platform) => {
                  const ps = stats.summary.by_platform[platform];
                  if (!ps) return null;
                  const colors =
                    platformColors[platform] || platformColors.clay_android;
                  const isSelected = selectedPlatform === platform;
                  return (
                    <SidebarMenuItem key={platform}>
                      <SidebarMenuButton
                        isActive={isSelected}
                        onClick={() => onPlatformChange(platform)}
                        tooltip={`${PLATFORM_DISPLAY_NAMES[platform]} (${ps.coverage_percent}%)`}
                        className="pl-6"
                      >
                        <PlatformIcon
                          platform={platform}
                          className={cn('h-4 w-4', colors.text)}
                        />
                        <span className="flex-1">
                          {PLATFORM_DISPLAY_NAMES[platform]}
                        </span>
                        <span className={cn('text-xs font-mono', colors.text)}>
                          {ps.coverage_percent}%
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
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
                    <page.icon className="h-4 w-4" />
                    <span>{page.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help"
              className="text-muted-foreground hover:text-foreground"
            >
              <a
                href={withBase(
                  lang === 'zh' ? '/zh/api/status/help' : '/api/status/help',
                )}
              >
                <HelpCircleIcon className="h-4 w-4" />
                <span>Help</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] text-muted-foreground">
            Updated {updatedDate}
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default APIStatusSidebar;
