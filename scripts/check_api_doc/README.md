# API Documentation Checker

This directory contains scripts to verify and maintain the consistency of the API documentation.

## Components

- **`index.py`**: The main entry point. Scans `docs/en/api` and `docs/zh/api` for MDX files and runs checks.
- **`check_mdx.py`**: Contains the logic to process individual MDX files.
  - Verifies frontmatter structure.
  - Ensures `APISummary` and `APITable` tags are correct and simplified.
  - Checks for missing `@lynx` imports.
- **`imports.py`**: logic for parsing and fixing imports.
  - Merges duplicate `@lynx` imports into a single statement.
  - Adds missing components to the import list.
- **`utils.py`**: Shared utilities (constants, frontmatter parsing).

## Usage

Run from the project root:

```bash
# Check for issues
python3 -m scripts.check_api_doc.index

# Fix issues automatically
python3 -m scripts.check_api_doc.index --fix
```

## Checks Performed

1.  **Frontmatter Cleanup**: Removes `id` and `slug` fields.
2.  **API Query**: Ensures `api: <query>` is present in frontmatter if used by components.
3.  **Component Simplification**: Converts `<APISummary query="...">` to `<APISummary />` if the query matches the frontmatter.
4.  **APISummary Insertion**: Inserts `<APISummary />` after the H1 title if missing but an API query is defined.
5.  **Import Verification**: Ensures all used Lynx components (e.g., `APITable`, `APISummary`, `Badge`) are imported from `@lynx`.
6.  **Import Deduplication**: Merges multiple `import { ... } from '@lynx'` lines into one.
