# Blog Index Plugin

An Rspress plugin that automatically generates blog index pages at build time.

## Features

- **Auto-generation**: Dynamically creates blog index pages during build
- **Multi-language support**: Generates separate indexes for English and Chinese
- **Metadata extraction**: Automatically extracts titles, dates, authors, and excerpts from blog posts
- **Consistent styling**: Uses BlogAvatar components for author attribution

## How it works

The plugin uses Rspress's `addPages` hook to:
1. Scan all blog MDX files in `docs/{en,zh}/blog/`
2. Extract metadata (title, date, authors, excerpt) from each post
3. Generate virtual index pages at `/en/blog/index` and `/zh/blog/index`
4. Sort posts by date (newest first)

## Usage

The plugin is automatically enabled in `rspress.config.ts`:

\`\`\`typescript
import { pluginBlogIndex } from '@lynx-js/rspress-plugin-blog-index';

export default defineConfig({
  plugins: [
    pluginBlogIndex(),
    // ... other plugins
  ],
});
\`\`\`

## Generated content

Each blog post entry includes:
- Title (linked to the full post)
- Publication date
- Author avatars (via BlogAvatar component)
- Excerpt (first paragraph, max 300 characters)

## No manual maintenance required

Unlike the previous script-based approach, the plugin generates pages dynamically at build time, eliminating the need for:
- Pre-build scripts
- Static index files
- Manual regeneration
