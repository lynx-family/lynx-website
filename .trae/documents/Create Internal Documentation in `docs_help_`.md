I will create the contributor guide using **"Documentation Components"** as the name for the component reference.

### 1. File Structure (English & Chinese)

**Directory**: `docs/en/help/` and `docs/zh/help/`

**Files**:

1. **`index.mdx`** **(The Catalog)**

   - Central hub linking to all guides.

2. **`writing-guide.mdx`** **(General Authoring)**

   - **Page Configuration**: `frontmatter` (`title`, `context`).
   - **Platform Context**: Writing platform-specific docs.

3. **`writing-blog.mdx`** **(Blogging)**

   - **Guide**: Creating posts in `docs/en/blog/`.

4. **`doc-components.mdx`** **(Documentation Components)**

   - **"Storybook"**: Live previews of `@lynx` components (`Callout`, `Badge`, `PlatformTabs`, etc.).

5. **`documenting-apis.mdx`** **(Documenting APIs)**

   - **Data**: `lynx-compat-data`.
   - **Display**: `<APITable>`/`<APISummary>`.
   - **Tools**: `typedoc` and `check_api_doc`.

6. **`managing-examples.mdx`** **(Managing Examples)**

   - **Workflow**: `lynx-example-packages` and `scripts/lynx-example.js`.
   - **Display**: `<Go>` component.

7. **`managing-spec.mdx`** **(Managing Spec)**

   - **Guide**: Editing `lynx-living-spec`.

8. **`subsite-architecture.mdx`** **(Multi-Subsite Architecture)**

   - **Architecture**: Explaining the multi-subsite design.
   - **Implementation**: `rspress.config.ts` and `theme/subsite-ui.tsx`.

9. **`api-status-dashboard.mdx`** **(API Status Dashboard)**
   - **Move**: `docs/en/api/status/help.mdx` → `docs/en/help/api-status-dashboard.mdx`.
   - **Move**: `docs/zh/api/status/help.mdx` → `docs/zh/help/api-status-dashboard.mdx`.

### 2. Implementation Steps

1. **Move Files**: Relocate the API Status help files.
2. **Create Directories**: Ensure `help/` directories exist.
3. **Write Content**: Author the MDX files.
4. **Verification**: Verify structure and content rendering.
