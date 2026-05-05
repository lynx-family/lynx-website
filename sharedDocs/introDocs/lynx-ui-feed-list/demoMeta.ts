export const feedListBasicDemoMeta = {
  highlight: '{85-120}',
  description: 'highlight FeedList configuration and direct list-item children',
  content: [
    '<FeedList',
    "  listId='feedListBasic'",
    "  listType='single'",
    '  refreshOptions={{ ... }}',
    '  onScrollToLower={handleLoadMore}',
    '>',
    "  <list-item item-key='demo-header'>...</list-item>",
    '  {items.map(item => <list-item item-key={item.key}>...</list-item>)}',
    '</FeedList>',
  ],
};

export const feedListFooterDemoMeta = {
  highlight: '{34-57,72-81,97-98}',
  description:
    'highlight load-more and no-more footer renderers plus status switching',
  content: [
    'const renderLoadMoreFooter = useMemo(() => (...)',
    'const renderNoMoreFooter = useMemo(() => (...)',
    'feedListRef.current?.changeHasMoreStatus(false)',
    'loadMoreFooter={renderLoadMoreFooter}',
    'noMoreDataFooter={renderNoMoreFooter}',
  ],
};

export const feedListDirectRefreshDemoMeta = {
  highlight: '{17,59-69,92-96}',
  description:
    'highlight the ref, refresh handler, and refreshOptions connection',
  content: [
    'const feedListRef = useRef<FeedListRef>(null)',
    'const handleRefresh = () => { ... }',
    'feedListRef.current?.finishRefresh()',
    'refreshOptions={{',
    '  enableRefresh: true,',
    '  headerContent: renderRefreshHeader,',
    '  onStartRefresh: handleRefresh,',
    '}}',
  ],
};

export const feedListRefreshOptionsDemoMeta = {
  highlight: '{22-31,59-69,92-96}',
  description:
    'highlight the refresh header, refresh handler, and refreshOptions wiring',
  content: [
    'const renderRefreshHeader = useMemo(() => (...)',
    'const handleRefresh = () => {',
    '  setItems(...)',
    '  feedListRef.current?.finishRefresh()',
    '}',
    'refreshOptions={{',
    '  enableRefresh: true,',
    '  headerContent: renderRefreshHeader,',
    '  onStartRefresh: handleRefresh,',
    '}}',
  ],
};
