import React from 'react';
import { cn } from '@/lib/utils';
import { PlatformSvg } from '@/components/platform-navigation/PlatformIcon';

export interface PlatformConfig {
  label: string;
  icon: React.FC<{ className?: string }>;
  colors: {
    bg: string;
    border: string;
    text: string;
    progress: string;
    line: string;
  };
}

const makeIcon = (platformName: string): React.FC<{ className?: string }> => {
  return ({ className }) => (
    <PlatformSvg
      platformName={platformName}
      className={cn('bg-current shrink-0', className)}
    />
  );
};

const AndroidIcon = makeIcon('android');
const IOSIcon = makeIcon('ios');
const HarmonyIcon = makeIcon('harmony');
const WebIcon = makeIcon('web_lynx');
const ClayIcon = makeIcon('clay');
const MacOSIcon = makeIcon('clay_macos');
const WindowsIcon = makeIcon('clay_windows');

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  android: {
    label: 'Android',
    icon: AndroidIcon,
    colors: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      progress: 'bg-emerald-500',
      line: '#10b981',
    },
  },
  ios: {
    label: 'iOS',
    icon: IOSIcon,
    colors: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
      progress: 'bg-blue-500',
      line: '#3b82f6',
    },
  },
  harmony: {
    label: 'HarmonyOS',
    icon: HarmonyIcon,
    colors: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500',
      text: 'text-orange-700 dark:text-orange-400',
      progress: 'bg-orange-500',
      line: '#f97316',
    },
  },
  web_lynx: {
    label: 'Web',
    icon: WebIcon,
    colors: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500',
      text: 'text-purple-700 dark:text-purple-400',
      progress: 'bg-purple-500',
      line: '#a855f7',
    },
  },
  clay: {
    label: 'Clay',
    icon: ClayIcon,
    colors: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500',
      text: 'text-teal-700 dark:text-teal-400',
      progress: 'bg-teal-500',
      line: '#14b8a6',
    },
  },
  clay_android: {
    label: 'Clay Android',
    icon: ClayIcon,
    colors: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500',
      text: 'text-teal-700 dark:text-teal-400',
      progress: 'bg-teal-500',
      line: '#14b8a6',
    },
  },
  clay_ios: {
    label: 'Clay iOS',
    icon: ClayIcon,
    colors: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500',
      text: 'text-cyan-700 dark:text-cyan-400',
      progress: 'bg-cyan-500',
      line: '#06b6d4',
    },
  },
  clay_macos: {
    label: 'Clay MacOS',
    icon: MacOSIcon,
    colors: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-400',
      progress: 'bg-indigo-500',
      line: '#6366f1',
    },
  },
  clay_windows: {
    label: 'Clay Windows',
    icon: WindowsIcon,
    colors: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500',
      text: 'text-sky-700 dark:text-sky-400',
      progress: 'bg-sky-500',
      line: '#0ea5e9',
    },
  },
};
