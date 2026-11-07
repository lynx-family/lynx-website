import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { loadTsxModule } from './test-support/load-tsx-module.mjs';

const h = React.createElement;

/**
 * Load the production document Layout with a fixed default-content marker.
 * Capture the props reaching Rspress to verify identity as well as rendering.
 * Notice contents, route conditions and homepage modules are outside this test.
 *
 * @returns {Promise<object>} Layout, default marker and an observed-props getter.
 */
async function loadLayout() {
  const empty = () => null;
  const BeforeDocContent = () => h('p', null, 'Shared content');
  let receivedProps;
  const { default: Layout } = await loadTsxModule(
    new URL('../theme/Layout.tsx', import.meta.url),
    {
      react: React,
      'react/jsx-runtime': jsxRuntime,
      '@rspress/core/runtime': {
        Head: empty,
        removeBase: (value) => value,
        useLocation: () => ({ pathname: '/guide/example' }),
        usePageData: () => ({ page: {} }),
      },
      '@rspress/core/theme-original': {
        Layout: (props) => {
          receivedProps = props;
          return h('main', null, props.beforeDocContent, props.afterDocContent);
        },
      },
      '@/components/home-comps': { Footer: empty },
      './AfterNavTitle': { default: empty },
      './BeforeDocContent': { default: BeforeDocContent },
      './BeforeSidebar': { default: empty },
      './OgHead': { default: empty },
      './api-reference': { isGeneratedApiPage: () => false },
      './api-subsites': { subsiteOf: () => 'guide' },
    },
  );
  return { Layout, BeforeDocContent, getReceivedProps: () => receivedProps };
}

test('omitted and undefined slots render the shared default once', async () => {
  const { Layout, BeforeDocContent, getReceivedProps } = await loadLayout();
  for (const props of [{}, { beforeDocContent: undefined }]) {
    assert.equal(
      renderToStaticMarkup(h(Layout, props)),
      '<main><p>Shared content</p></main>',
    );
    assert.equal(getReceivedProps().beforeDocContent.type, BeforeDocContent);
  }
});

test('caller content replaces the default and other slots pass through', async () => {
  const { Layout, getReceivedProps } = await loadLayout();
  const beforeDocContent = h('p', null, 'Caller indicator');
  const afterDocContent = h('p', null, 'After content');
  assert.equal(
    renderToStaticMarkup(h(Layout, { beforeDocContent, afterDocContent })),
    '<main><p>Caller indicator</p><p>After content</p></main>',
  );
  assert.equal(getReceivedProps().beforeDocContent, beforeDocContent);
  assert.equal(getReceivedProps().afterDocContent, afterDocContent);
});

test('explicit null and other defined falsy nodes pass through unchanged', async () => {
  const { Layout, getReceivedProps } = await loadLayout();
  for (const value of [null, false, '', 0]) {
    assert.equal(
      renderToStaticMarkup(h(Layout, { beforeDocContent: value })),
      `<main>${value === 0 ? '0' : ''}</main>`,
    );
    assert.equal(getReceivedProps().beforeDocContent, value);
  }
});

test('consumer composition preserves order, renders once and retains overrides', async () => {
  const { Layout, BeforeDocContent, getReceivedProps } = await loadLayout();
  function ConsumerContent() {
    return h(
      React.Fragment,
      null,
      h('p', null, 'Consumer indicator'),
      h(BeforeDocContent),
    );
  }
  /** Model a downstream wrapper whose default preserves caller overrides. */
  function ConsumerLayout({ beforeDocContent = h(ConsumerContent), ...props }) {
    return h(Layout, { ...props, beforeDocContent });
  }

  for (const props of [{}, { beforeDocContent: undefined }]) {
    assert.equal(
      renderToStaticMarkup(h(ConsumerLayout, props)),
      '<main><p>Consumer indicator</p><p>Shared content</p></main>',
    );
  }
  assert.equal(
    renderToStaticMarkup(h(ConsumerLayout, { beforeDocContent: null })),
    '<main></main>',
  );
  assert.equal(getReceivedProps().beforeDocContent, null);
  const replacement = h('p', null, 'Replacement');
  assert.equal(
    renderToStaticMarkup(h(ConsumerLayout, { beforeDocContent: replacement })),
    '<main><p>Replacement</p></main>',
  );
  assert.equal(getReceivedProps().beforeDocContent, replacement);
});

test('theme entry exports BeforeDocContent', () => {
  const entry = new URL('../theme/index.tsx', import.meta.url);
  const entryPath = fileURLToPath(entry);
  const source = ts.createSourceFile(
    entryPath,
    fs.readFileSync(entryPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const exportsBeforeDocContent = source.statements.some(
    (statement) =>
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some(
        (specifier) =>
          !specifier.isTypeOnly && specifier.name.text === 'BeforeDocContent',
      ),
  );

  assert.equal(exportsBeforeDocContent, true);
});
