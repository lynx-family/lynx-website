/**
 * Sub-sites and shared docs configuration
 */

/**
 * Metadata for each subsites. This is used to
 * - generate the sidebar subsite selector dropdown UI.
 * - define the routes that shares common files.
 */
export type SubsiteConfig = {
  value: string;
  label: string;
  description: string;
  descriptionZh: string;
  home: string;
  url: string;
  logo: {
    light: string;
    dark: string;
  };
  /** When set, the subsite links to an external URL instead of an internal route. */
  external?: string;
  /** Category for dropdown column grouping. */
  category?: 'core' | 'js-framework' | 'native-framework';
  /** When set, this subsite is shown as a sub-item under the given parent in the dropdown. */
  parentValue?: string;
  /** Optional badge shown next to the label in the dropdown (e.g. "OSS", "Coming Soon"). */
  badge?: string;
  /** When true, the subsite is shown in the dropdown but interaction is disabled. */
  disabled?: boolean;
};

export const SUBSITES_CONFIG: SubsiteConfig[] = [
  // ── Core ──────────────────────────────────────────────────────
  {
    value: 'guide',
    label: 'Lynx',
    description: 'Lynx Fundamentals',
    descriptionZh: 'Lynx 基础',
    home: '/',
    url: '/guide/ui/elements-components',
    category: 'core',
    logo: {
      light:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-dark-logo.svg',
      dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/lynx-light-logo.svg',
    },
  },
  {
    value: 'ai',
    label: 'AI',
    description: 'Lynx for AI',
    descriptionZh: '面向 AI 的 Lynx',
    home: '/ai/',
    url: '/ai/',
    category: 'core',
    logo: {
      light: '/assets/lynxai-logo-light.svg',
      dark: '/assets/lynxai-logo-dark.svg',
    },
  },
  {
    value: 'rspeedy',
    label: 'Rspeedy',
    description: 'Build Tool for Lynx',
    descriptionZh: 'Lynx 构建工具',
    home: '/rspeedy/',
    url: '/rspeedy/cli',
    category: 'core',
    logo: {
      light:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/rspeedy.PNG',
      dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/rspeedy.PNG',
    },
  },

  // ── JavaScript Framework ──────────────────────────────────────
  {
    value: 'react',
    label: 'ReactLynx',
    description: 'React to Lynx',
    descriptionZh: '用 React 开发 Lynx 应用',
    home: '/react/',
    url: '/react/introduction',
    category: 'js-framework',
    logo: {
      light:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/reactlynx-logo-light.svg',
      dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/reactlynx-logo-dark.svg',
    },
  },
  {
    value: 'ui',
    label: 'lynx-ui',
    description: 'UI for ReactLynx',
    descriptionZh: 'ReactLynx 组件库',
    home: '/ui/',
    url: '/ui/introduction',
    category: 'js-framework',
    parentValue: 'react',
    logo: {
      light: '/assets/lynx-ui-icon-dark.svg',
      dark: '/assets/lynx-ui-icon-light.svg',
    },
  },
  {
    value: 'reactlynx-use',
    label: 'ReactLynx Use',
    description: 'Hooks for ReactLynx',
    descriptionZh: 'ReactLynx Hooks 库',
    external: 'https://hooks.lynxjs.org',
    home: '',
    url: '',
    category: 'js-framework',
    parentValue: 'react',
    logo: {
      light:
        'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/reactlynx-logo-light.svg',
      dark: 'https://lf-lynx.tiktok-cdns.com/obj/lynx-artifacts-oss-sg/lynx-website/assets/reactlynx-logo-dark.svg',
    },
  },
  {
    value: 'vue-lynx',
    label: 'Vue Lynx',
    description: 'Vue to Lynx',
    descriptionZh: '用 Vue 开发 Lynx 应用',
    external: 'https://vue.lynxjs.org',
    home: '',
    url: '',
    category: 'js-framework',
    logo: {
      light: 'https://vuejs.org/logo.svg',
      dark: 'https://vuejs.org/logo.svg',
    },
  },

  // ── Native Framework ──────────────────────────────────────────
  {
    value: 'lynxtron',
    label: 'Lynxtron',
    description: 'Desktop apps with Lynx',
    descriptionZh: '使用 Lynx 构建桌面应用',
    home: '/lynxtron/',
    url: '/lynxtron/introduction',
    category: 'native-framework',
    logo: {
      light: '/assets/lynxtron/lynxtron-icon-light.svg',
      dark: '/assets/lynxtron/lynxtron-icon-dark.svg',
    },
  },
  {
    value: 'sparkling',
    label: 'Sparkling',
    description: 'Lynx at TikTok scale',
    descriptionZh: 'TikTok 级 Lynx 设施',
    external: 'https://tiktok.github.io/sparkling',
    home: '',
    url: '',
    category: 'native-framework',
    logo: {
      light: 'https://tiktok.github.io/sparkling/sparkling_logo_144_light.png',
      dark: 'https://tiktok.github.io/sparkling/sparkling_logo_144.png',
    },
  },
];

/** Subsites with internal docs routes, excluding disabled ones (for sidebar). */
export const CORE_SUBSITES = SUBSITES_CONFIG.filter(
  (s) => !s.external && !s.disabled,
);

/**
 * Canonical Quick Start URL.
 *
 * The page lives under `/guide/` because Lynx is the platform every other
 * subsite is defined relative to (Rspeedy = build tool for Lynx, ReactLynx
 * = React on Lynx, lynx-ui = UI for ReactLynx, …). The page itself is a
 * branching switcher (ChoiceTabs) that fans *out* into framework-specific
 * tracks — its job is to send you somewhere, not to belong somewhere — so
 * routing it under the platform is the honest framing.
 *
 * Clicking the Lynx icon in SubsiteRow and every subsite home-page CTA
 * land here. Historical `/{ai,react,rspeedy,lynx-ui}/start/quick-start`
 * URLs are 301'd to this canonical in netlify.toml.
 */
export const QUICK_START_PATH = '/guide/start/quick-start';

/** Subsites that link to external sites. */
export const ECOSYSTEM_SUBSITES = SUBSITES_CONFIG.filter((s) => s.external);

// ── Dropdown column helpers ─────────────────────────────────────
/** Top-level items (non-sub-items) for a given category. */
const topLevel = (cat: SubsiteConfig['category']) =>
  SUBSITES_CONFIG.filter((s) => s.category === cat && !s.parentValue);

/** Sub-items nested under a parent value. */
export const getSubItems = (parentValue: string) =>
  SUBSITES_CONFIG.filter((s) => s.parentValue === parentValue);

export const DROPDOWN_CORE = topLevel('core');
export const DROPDOWN_JS_FRAMEWORK = topLevel('js-framework');
export const DROPDOWN_NATIVE_FRAMEWORK = topLevel('native-framework');

/**
 * First-segment values that count as a "subsite" — used by BeforeSidebar to
 * decide whether to render the SubsiteRow nav header.
 */
export const SHARED_SIDEBAR_PATHS = CORE_SUBSITES.map((config) => config.value);

/**
 * Gets the current URL path prefix from the pathname.
 * Used to determine which path (guide/react/rspeedy) is currently being viewed.
 *
 * @example
 * getUrlPathPrefix('/guide/start/quick-start', ['guide', 'react']) // Returns '/guide'
 *
 * @param pathname - Current URL pathname
 * @param sharedPaths - Array of URL path prefixes to check against
 * @returns The matching path prefix with leading slash, or empty string if no match
 */
export function getUrlPathPrefix(pathname: string, sharedPaths: string[]) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '';
  }

  const [first, second] = segments;
  const effectiveSegment = first === 'zh' ? second : first;

  if (!effectiveSegment) {
    return '';
  }

  if (sharedPaths.includes(effectiveSegment)) {
    return `/${effectiveSegment}`;
  }

  return '';
}

/**
 * Gets language prefix for URLs based on current language.
 * Critical for maintaining proper i18n routing.
 *
 * @param lang - Current language code
 * @returns Language prefix for URLs ('/' for English, '/zh' for Chinese)
 */
export function getLangPrefix(lang: string) {
  // The constant here must match the configured lang in rspress.config.ts.
  return lang === 'en' ? '' : `/${lang}`;
}
