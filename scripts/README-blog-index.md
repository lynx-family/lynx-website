# Blog Index Generation

This script automatically generates the blog index pages (`docs/en/blog/index.mdx` and `docs/zh/blog/index.mdx`) at build time.

## How it works

1. The script reads all MDX files from `docs/[lang]/blog/` directories
2. For each blog post, it extracts:
   - Title (from the first H1 heading)
   - Date (from the frontmatter `date` field)
   - Date string (formatted date like "_September 3rd, 2025_")
   - Authors (from the `<BlogAvatar list={[...]} />` component)
   - Excerpt (first paragraph of meaningful text after the avatar)
3. Posts are sorted by date (newest first)
4. The index page is generated with:
   - Proper frontmatter (title, sidebar: false)
   - BlogAvatar component import
   - Page title and description
   - List of blog posts with links, dates, authors, and excerpts

## Usage

The script runs automatically as part of the `prepare` script:

```bash
pnpm prepare
```

Or you can run it manually:

```bash
node scripts/generate-blog-index.js
```

## Benefits

- **No manual maintenance**: Blog index pages are automatically updated when new posts are added
- **Consistent format**: All blog entries follow the same structure
- **Uses BlogAvatar components**: Properly displays author information with avatars
- **No plain links**: Avoids plain `<a>` tags that have blue-ish color
- **Automatic excerpts**: Extracts meaningful preview text from each post

## Adding a new blog post

1. Create a new MDX file in `docs/en/blog/` and `docs/zh/blog/` (e.g., `new-post.mdx`)
2. Add proper frontmatter with `date` field:
   ```yaml
   ---
   date: 2025-12-15
   sidebar: false
   ---
   ```
3. Add the formatted date string (e.g., `_December 15th, 2025_`)
4. Add the title as an H1 heading
5. Add the `<BlogAvatar list={[...]} />` component with author IDs
6. Write your blog post content
7. Run `pnpm prepare:blog-index` or just commit and push (the prepare script runs automatically)

The blog index pages will be automatically regenerated with your new post!
