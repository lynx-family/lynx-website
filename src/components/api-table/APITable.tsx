import { usePageData } from '@rspress/core/runtime';
import Callout from '../Callout';
import { FetchingCompatTable } from './FetchingCompatTable';

interface APITableProps {
  /**
   * The query to fetch the data from the server.
   * {@inheritDoc FetchingCompatTable#query}
   */
  query?: string;
}

/**
 * This wrapper is intended to integrate with the Lynx docs to automatically
 * get the query from frontmatter.
 */
export default function APITable(props: APITableProps) {
  const { page } = usePageData();
  const frontmatter = page.frontmatter;

  let query = props.query;

  // If query is not provided, try to get it from frontmatter api
  if (!query) {
    if (!frontmatter.api) {
      return (
        <Callout type="info" title="Missing API Query">
          <p>
            Either a query must be provided as the `query` prop to the{' '}
            <code>&lt;APITable /&gt;</code>, or it will be retrieved from the{' '}
            <code>api</code> field in the frontmatter of the current page.
          </p>
        </Callout>
      );
    }
    query = frontmatter.api as string;
  }

  const tableId = `compat-table-${query.replace(/[\/.]/g, '-')}`;

  return (
    <div className="rp-not-doc" id={tableId}>
      <FetchingCompatTable query={query} />
    </div>
  );
}
