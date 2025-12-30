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
import { PLATFORM_CONFIG } from './constants';
import { CLAY_PLATFORMS, NATIVE_PLATFORMS, type APIStats } from './types';

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
    PLATFORM_CONFIG[selectedPlatform]?.colors || PLATFORM_CONFIG.android.colors;

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
              <PlatformIcon
                platform={selectedPlatform}
                className={cn('h-3 w-3', currentPlatformColors.text)}
              />
              <span className={currentPlatformColors.text}>
                {PLATFORM_CONFIG[selectedPlatform]?.label || selectedPlatform}{' '}
                {currentPlatformStats?.coverage_percent}%
              </span>
            </div>
          </div>
        )}
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
                  PLATFORM_CONFIG[platform]?.colors ||
                  PLATFORM_CONFIG.android.colors;
                const isSelected = selectedPlatform === platform;
                return (
                  <SidebarMenuItem key={platform}>
                    <SidebarMenuButton
                      isActive={isSelected}
                      onClick={() => onPlatformChange(platform)}
                      tooltip={`${PLATFORM_CONFIG[platform]?.label || platform} (${ps.coverage_percent}%)`}
                    >
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

              {/* Clay Toggle */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onShowClayChange(!showClay)}
                  tooltip="Toggle Clay Platforms"
                >
                  <PlatformIcon
                    platform="clay_android"
                    className={cn(
                      'w-4 h-4',
                      showClay ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <span className="flex-1">Clay</span>
                  {showClay && (
                    <svg
                      className="w-3 h-3 text-primary"
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
                    PLATFORM_CONFIG[platform]?.colors ||
                    PLATFORM_CONFIG.clay_android.colors;
                  const isSelected = selectedPlatform === platform;
                  return (
                    <SidebarMenuItem key={platform}>
                      <SidebarMenuButton
                        isActive={isSelected}
                        onClick={() => onPlatformChange(platform)}
                        tooltip={`${PLATFORM_CONFIG[platform]?.label || platform} (${ps.coverage_percent}%)`}
                        className="pl-6"
                      >
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

      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
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
