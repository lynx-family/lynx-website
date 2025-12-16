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
          logo: 'Lynx Blog',
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
          logo: 'Lynx 博客',
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
          logo: 'Lynx',
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
          logo: 'Lynx',
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
          logo: 'Lynx',
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
          logo: 'Lynx',
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
          logo: 'Lynx',
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
          logo: 'Lynx',
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          textColor: '#ffffff',
          sharedImageName: 'api-zh', // Use shared image for all zh/api routes
        };
      },
    },
  ] as RouteOGImageConfig[],
};
