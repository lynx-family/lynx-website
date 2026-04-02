# API Table

It is a 2-layered thin wrapper over the `<APITable>` component:

- `<FetchingCompatTable>`: this dynamically import the source code of the `<APITable>` and fetch the data on demand.
- `<APITable>`: this further wrap over the `<FetchingCompatTable>` to get the query from frontmatter of the current page when the query is not specified. This component is the one actually exposed to the docs.

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
