import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type * as LCD from '@lynx-js/lynx-compat-data';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrowserInfoContext } from './browser-info';
import { Legend, LEGEND_LABELS } from './legend';

const dataRoot = '../../../../packages/lynx-compat-data/';
const browserInfo: LCD.Platforms = JSON.parse(
  readFileSync(
    new URL(`${dataRoot}platforms/platforms.json`, import.meta.url),
    'utf8',
  ),
).platforms;
const timer: LCD.Identifier = JSON.parse(
  readFileSync(
    new URL(`${dataRoot}lynx-api/global/setTimeout.json`, import.meta.url),
    'utf8',
  ),
)['lynx-api'].global.setTimeout;
const visibleBrowsers: LCD.PlatformName[] = [
  'android',
  'ios',
  'harmony',
  'clay_macos',
  'clay_windows',
  'web_lynx',
];
const allBrowsers = Object.keys(browserInfo) as LCD.PlatformName[];

function render(compat: LCD.Identifier, browsers = visibleBrowsers) {
  return renderToStaticMarkup(
    <BrowserInfoContext.Provider value={browserInfo}>
      <Legend compat={compat} name="setTimeout" browsers={browsers} />
    </BrowserInfoContext.Provider>,
  );
}

function labels(html: string) {
  return [...html.matchAll(/<dd class="bc-legend-item-dd">([^<]+)<\/dd>/g)].map(
    ([, label]) => label,
  );
}

test('legend explains the support states of displayed platform columns', async (t) => {
  await t.test('supported visible columns omit hidden Clay states', () => {
    assert.deepEqual(labels(render(timer)), [LEGEND_LABELS.yes]);
  });

  await t.test('a displayed platform with no support record is unknown', () => {
    assert.deepEqual(labels(render(timer, allBrowsers)), [
      LEGEND_LABELS.yes,
      LEGEND_LABELS.unknown,
    ]);
  });

  await t.test('explicit false support is unsupported', () => {
    const compat = structuredClone(timer);
    compat.__compat!.support.android = { version_added: false };
    assert.deepEqual(labels(render(compat)), [
      LEGEND_LABELS.yes,
      LEGEND_LABELS.no,
    ]);
  });

  await t.test('explicit null support is unknown', () => {
    const compat = structuredClone(timer);
    compat.__compat!.support.android = { version_added: null };
    assert.deepEqual(labels(render(compat)), [
      LEGEND_LABELS.yes,
      LEGEND_LABELS.unknown,
    ]);
  });

  await t.test('preview and implementation notes retain their legends', () => {
    const compat = structuredClone(timer);
    compat.__compat!.status = { deprecated: true, experimental: true };
    compat.__compat!.support.android = [
      { version_added: 'preview', notes: ['Preview implementation'] },
      {
        version_added: '1.3',
        partial_implementation: true,
        prefix: '-lynx-',
        alternative_name: 'alternateTimeout',
        flags: [
          { type: 'preference', name: 'enable-timeout', value_to_set: 'true' },
        ],
      },
    ];
    assert.deepEqual(labels(render(compat)), [
      LEGEND_LABELS.yes,
      LEGEND_LABELS.partial,
      LEGEND_LABELS.preview,
      LEGEND_LABELS.no,
      LEGEND_LABELS.experimental,
      LEGEND_LABELS.deprecated,
      LEGEND_LABELS.footnote,
      LEGEND_LABELS.disabled,
      LEGEND_LABELS.altname,
      LEGEND_LABELS.prefix,
      LEGEND_LABELS.more,
    ]);
  });

  await t.test('missing platform context reports a render error', () => {
    assert.throws(
      () =>
        renderToStaticMarkup(
          <Legend
            compat={timer}
            name="setTimeout"
            browsers={visibleBrowsers}
          />,
        ),
      /Missing browser info/,
    );
  });
});
