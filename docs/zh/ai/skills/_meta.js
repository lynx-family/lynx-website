module.exports = (meta) => {
  const entries = [...meta];
  const insertAfter = (name, pages) => {
    const index = entries.findIndex((item) => item.name === name);
    if (index === -1)
      throw new Error(`Missing Skills navigation entry: ${name}`);
    entries.splice(
      index + 1,
      0,
      ...pages.map((name) => ({ type: 'file', name })),
    );
  };
  insertAfter('reactlynx-best-practices.mdx', ['lynx-api-docs.mdx']);
  insertAfter('lynx-devtool.mdx', [
    'lynx-ui.mdx',
    'lynx-a2ui.mdx',
    'lynx-openui.mdx',
  ]);
  insertAfter('rspeedy-bundle-size.mdx', [
    'trace-analysis.mdx',
    'trace-record.mdx',
  ]);
  return entries;
};
