import type { RouteOGImageConfig } from './plugins/og-image-generator/src/index';
import { SUBSITES_CONFIG } from './shared-route-config';

/**
 * Configuration for dynamic OG image generation
 */
export const ogImageGeneratorConfig = {
  baseUrl: 'https://lynxjs.org/next',
  routes: [
    // Blog posts - each gets its own OG image with the title
    {
      pattern: /^\/blog\/[^/]+\.html$/,
      getConfig: ({ routePath, frontmatter, title }) => {
        if (!title) return null;
        return {
          title,
          logo: 'Lynx Blog',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
        };
      },
    },
    {
      pattern: /^\/zh\/blog\/[^/]+\.html$/,
      getConfig: ({ routePath, frontmatter, title }) => {
        if (!title) return null;
        return {
          title,
          logo: 'Lynx 博客',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColor: '#ffffff',
        };
      },
    },
    // ReactLynx subsite
    {
      pattern: /^\/react\//,
      getConfig: ({ routePath }) => {
        const subsiteConfig = SUBSITES_CONFIG.find((s) => s.value === 'react');
        if (!subsiteConfig) return null;
        return {
          title: subsiteConfig.label,
          subtitle: subsiteConfig.description,
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
          textColor: '#ffffff',
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
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
          textColor: '#ffffff',
        };
      },
    },
    // Rspeedy subsite
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
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          textColor: '#ffffff',
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
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          textColor: '#ffffff',
        };
      },
    },
    // API subsite
    {
      pattern: /^\/api\//,
      getConfig: ({ routePath }) => {
        return {
          title: 'Lynx API',
          subtitle: 'API Reference',
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          textColor: '#ffffff',
        };
      },
    },
    {
      pattern: /^\/zh\/api\//,
      getConfig: ({ routePath }) => {
        return {
          title: 'Lynx API',
          subtitle: 'API 参考',
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          textColor: '#ffffff',
        };
      },
    },
  ] as RouteOGImageConfig[],
};
