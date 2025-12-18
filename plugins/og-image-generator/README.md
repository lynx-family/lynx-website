# OG Image Generator Plugin for Rspress

This plugin dynamically generates Open Graph (OG) images for your Rspress site at build time.

## Features

- ✨ Generates unique OG images for each page based on route patterns
- 🎨 Customizable design with title, subtitle, logo, background, and text color
- ⚡️ Incremental generation - skips images that already exist
- 🔠 Uses Inter font for clean typography
- 📝 Automatically updates HTML meta tags for each page

## How It Works

The plugin hooks into Rspress's build lifecycle:

1. **routeGenerated hook**: Scans all routes and generates OG images based on pattern matching
2. **afterBuild hook**: Updates HTML files to inject the correct og:image and twitter:image meta tags

## Configuration

The plugin is configured in `rspress.config.ts`:

```typescript
import { pluginOGImageGenerator } from '@lynx-js/rspress-plugin-og-image-generator';

export default defineConfig({
  plugins: [
    pluginOGImageGenerator({
      baseUrl: 'https://yoursite.com/base',
      outputDir: 'og-images', // relative to docs/public/assets/
      incremental: true, // skip if image already exists
      routes: [
        {
          // Match blog posts
          pattern: /^\/blog\/[^/]+\.html$/,
          getConfig: ({ routePath, frontmatter, title }) => {
            if (!title) return null;
            return {
              title,
              logo: 'Your Site Blog',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textColor: '#ffffff',
            };
          },
        },
        // Add more route patterns...
      ],
    }),
  ],
});
```

## Route Patterns

Route patterns can be:

- **String**: Simple glob-like patterns (e.g., `/blog/*` matches all blog routes)
- **RegExp**: Regular expressions for more complex matching

## OGImageConfig

Each route configuration returns an `OGImageConfig` object:

```typescript
type OGImageConfig = {
  title: string; // Main heading
  subtitle?: string; // Optional subheading
  logo?: string; // Brand text (top left)
  background?: string; // CSS background (color or gradient)
  textColor?: string; // Text color (default: '#ffffff')
};
```

## Generated Images

Images are saved to `docs/public/assets/og-images/` with filenames based on the route path:

- Route: `/blog/my-post.html`
- Image: `docs/public/assets/og-images/blog-my-post.png`
- URL: `https://yoursite.com/assets/og-images/blog-my-post.png`

## Customization

### Custom Design

Modify `src/generator.ts` to customize the image layout, fonts, or styling. The current design uses:

- 1200x630px (standard OG image size)
- Inter font (regular and bold)
- Flexbox layout with logo, title, and subtitle

### Custom Fonts

To use different fonts:

1. Install font package (e.g., `pnpm add @fontsource/roboto`)
2. Update `getFontData()` in `src/generator.ts` to load your font files
3. Update `fontFamily` in the element styles

### Custom Colors per Route

You can customize colors for different sections:

```typescript
{
  pattern: /^\/api\//,
  getConfig: ({ routePath }) => ({
    title: 'API Documentation',
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    textColor: '#ffffff',
  }),
}
```

## Development

Build the plugin:

```bash
cd plugins/og-image-generator
pnpm build
```

The plugin will be automatically picked up by the main project through the workspace configuration.

## Fonts

The plugin uses a hybrid font loading strategy to minimize bundle size:

- **Inter** (Latin): Loaded from the bundled `@fontsource/inter` package (~200KB)
- **Noto Sans SC** (Chinese): Fetched from CDN on-demand only when Chinese characters are detected

Downloaded fonts are cached in `node_modules/.cache/rspress-og-fonts/` for subsequent builds, so the CDN is only hit once per CI environment.

## Notes

- Generated images are gitignored by default (see `.gitignore`)
- Images are generated once and reused on subsequent builds (unless deleted)
- Set `incremental: false` to regenerate all images on every build
- Chinese font is fetched from CDN (~5MB) only when generating images with Chinese text
