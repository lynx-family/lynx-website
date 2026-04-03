// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { usePageData } from '@rspress/core/runtime';
import RsContainer from '../RsContainer';
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
  const pageData = usePageData();
  const frontmatter = pageData.page.frontmatter;

  let query = props.query;

  // If query is not provided, try to get it from frontmatter api
  if (!query) {
    if (!frontmatter.api) {
      return (
        <RsContainer type="info" title="Missing API Query">
          <p>
            Either a query must be provided as the `query` prop to the{' '}
            <code>&lt;APITable /&gt;</code>, or it will be retrieved from the{' '}
            <code>api</code> field in the frontmatter of the current page.
          </p>
        </RsContainer>
      );
    }
    query = frontmatter.api as string;
  }
  console.log('query', query);

  return <FetchingCompatTable query={query} />;
}
