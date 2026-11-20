module.exports = (meta) => {
  const skills = meta.findIndex(
    (item) => item.type === 'section-header' && item.label === 'Skills',
  );
  return [
    { type: 'file', name: 'index.mdx', label: 'Lynx for AI' },
    { type: 'divider' },
    ...meta.slice(0, skills),
    { type: 'divider' },
    { type: 'section-header', label: 'Agents' },
    { type: 'file', name: 'agentsmd.mdx' },
    { type: 'divider' },
    ...meta.slice(skills),
    { type: 'divider' },
    { type: 'section-header', label: 'MCPs' },
    { type: 'file', name: 'lynx-docs-mcp.mdx' },
    { type: 'file', name: 'lynx-devtool-mcp.mdx' },
    { type: 'divider' },
    { type: 'section-header', label: 'Generative UI' },
    { type: 'custom-link', label: 'A2UI', link: '/react/genui/a2ui' },
    { type: 'custom-link', label: 'OpenUI', link: '/react/genui/openui' },
  ];
};
