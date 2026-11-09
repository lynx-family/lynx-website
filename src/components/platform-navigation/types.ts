export type Platform =
  | 'ios'
  | 'ios-simulator'
  | 'android'
  | 'web'
  | 'macos'
  | 'macos-arm64'
  | 'macos-intel';

export interface PlatformIconGroupProps {
  /** The platforms to show icons for */
  platforms?: Platform[];
  /** Optional className for styling */
  className?: string;
}
