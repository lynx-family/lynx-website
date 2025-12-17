# API Table

The `<APITable>` component fetches and displays API compatibility data.

- `<APITable>`: fetches compatibility data on demand and displays it. Gets the query from frontmatter of the current page when the query is not specified. This component is the one actually exposed to the docs.
- `<CompatTable>`: renders the fetched compatibility data.

## Usage

You can explicitly specify the query:

```mdx title="example.tsx"
import { APITable } from '@lynx';

<APITable query="test/api" />
```

Or, use the query from frontmatter of the current page:

```mdx title="example.mdx"
---
api: test/api
---

<APITable />
```
