import type { RouteOGImageConfig } from './plugins/og-image-generator/src/index';
import { SUBSITES_CONFIG } from './shared-route-config';

/**
 * Prefer local assets so OG generation doesn't depend on network access during build.
 */
const LYNX_LOGOS = {
  light: 'docs/public/assets/lynx-light-logo.svg',
  dark: 'docs/public/assets/lynx-dark-logo.svg',
} as const;

const OG_LOGO_HEIGHT = 75; // 50% larger than previous 50px

/**
 * Configuration for dynamic OG image generation
 */
export const ogImageGeneratorConfig = {
  baseUrl: 'https://lynxjs.org/next',
  routes: [
    // Blog posts - each gets its own OG image with the title
    {
      pattern: /^\/blog\/[^/]+/,
      getConfig: ({ routePath, frontmatter, title }) => {
        // Skip blog index page
        if (
          routePath === '/blog' ||
          routePath === '/blog/' ||
          routePath.endsWith('/blog.html')
        ) {
          return null;
        }
        if (!title) return null;
        return {
          title,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
        };
      },
    },
    {
      pattern: /^\/zh\/blog\/[^/]+/,
      getConfig: ({ routePath, frontmatter, title }) => {
        // Skip blog index page
        if (
          routePath === '/zh/blog' ||
          routePath === '/zh/blog/' ||
          routePath.endsWith('/blog.html')
        ) {
          return null;
        }
        if (!title) return null;
        return {
          title,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
        };
      },
    },
    // ReactLynx subsite - single shared image
    {
      pattern: /^\/react\//,
      getConfig: ({ routePath }) => {
        const subsiteConfig = SUBSITES_CONFIG.find((s) => s.value === 'react');
        if (!subsiteConfig) return null;
        return {
          title: subsiteConfig.label,
          subtitle: subsiteConfig.description,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
          textColor: '#ffffff',
          sharedImageName: 'react', // Use shared image for all react routes
        };
      },
    },
    {
      pattern: /^\/zh\/react\//,
      getConfig: ({ routePath }) => {
        const subsiteConfig = SUBSITES_CONFIG.find((s) => s.value === 'react');
        if (!subsiteConfig) return null;
        return {
          title: subsiteConfig.label,
          subtitle: subsiteConfig.descriptionZh,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
          textColor: '#ffffff',
          sharedImageName: 'react-zh', // Use shared image for all zh/react routes
        };
      },
    },
    // Rspeedy subsite - single shared image
    {
      pattern: /^\/rspeedy\//,
      getConfig: ({ routePath }) => {
        const subsiteConfig = SUBSITES_CONFIG.find(
          (s) => s.value === 'rspeedy',
        );
        if (!subsiteConfig) return null;
        return {
          title: subsiteConfig.label,
          subtitle: subsiteConfig.description,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          textColor: '#ffffff',
          sharedImageName: 'rspeedy', // Use shared image for all rspeedy routes
        };
      },
    },
    {
      pattern: /^\/zh\/rspeedy\//,
      getConfig: ({ routePath }) => {
        const subsiteConfig = SUBSITES_CONFIG.find(
          (s) => s.value === 'rspeedy',
        );
        if (!subsiteConfig) return null;
        return {
          title: subsiteConfig.label,
          subtitle: subsiteConfig.descriptionZh,
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          textColor: '#ffffff',
          sharedImageName: 'rspeedy-zh', // Use shared image for all zh/rspeedy routes
        };
      },
    },
    // API subsite - single shared image
    {
      pattern: /^\/api\//,
      getConfig: ({ routePath }) => {
        return {
          title: 'Lynx API',
          subtitle: 'API Reference',
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          textColor: '#ffffff',
          sharedImageName: 'api', // Use shared image for all api routes
        };
      },
    },
    {
      pattern: /^\/zh\/api\//,
      getConfig: ({ routePath }) => {
        return {
          title: 'Lynx API',
          subtitle: 'API 参考',
          logoImage: LYNX_LOGOS.light,
          logoHeight: OG_LOGO_HEIGHT,
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          textColor: '#ffffff',
          sharedImageName: 'api-zh', // Use shared image for all zh/api routes
        };
      },
    },
  ] as RouteOGImageConfig[],
};
