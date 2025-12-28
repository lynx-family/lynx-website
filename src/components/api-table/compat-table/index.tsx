/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *   Original source from MDN Yari:
 *   https://github.com/mdn/yari/tree/main/client/src/document/ingredients/browser-compatibility-table
 *   Copyright Mozilla Contributors
 *   Licensed under the Mozilla Public License, v. 2.0
 */
import type BCD from '@lynx-js/lynx-compat-data';
import { useI18n, useLocation, withBase } from '@rspress/core/runtime';
import type React from 'react';
import { useReducer } from 'react';
import EditThis from '../../EditThis';
import { BrowserInfoContext } from './browser-info';
import { BrowserCompatibilityErrorBoundary } from './error-boundary';
import { FeatureRow } from './feature-row';
import { Headers } from './headers';
import './index.scss';
import { Legend } from './legend';
import { listFeatures } from './utils';

// Note! Don't import any SCSS here inside *this* component.
// It's done in the component that lazy-loads this component.

// This string is used to prefill the body when clicking to file a new BCD
// issue over on github.com/mdn/browser-compat-data
const ISSUE_METADATA_TEMPLATE = `
<!-- Do not make changes below this line -->
<details>
<summary>MDN page report details</summary>

* Query: \`$QUERY_ID\`
* Report started: $DATE

</details>
`;

export const HIDDEN_BROWSERS = ['ie'];

/**
 * Return a list of platforms and browsers that are relevant for this category &
 * data.
 *
 * If the category is "webextensions", only those are shown. In all other cases
 * at least the entirety of the "desktop" and "mobile" platforms are shown. If
 * the category is JavaScript, the entirety of the "server" category is also
 * shown. In all other categories, if compat data has info about Deno / Node.js
 * those are also shown. Deno is always shown if Node.js is shown.
 */
function gatherPlatformsAndBrowsers(
  category: string,
  data: BCD.Identifier,
  browserInfo: BCD.Platforms,
): [string[], BCD.PlatformName[]] {
  const hasNodeJSData = data.__compat && 'nodejs' in data.__compat.support;
  const hasDenoData = data.__compat && 'deno' in data.__compat.support;

  const platforms: BCD.PlatformType[] = !!process.env.COMPAT_TABLE_HIDE_CLAY
    ? ['native', 'web']
    : ['native', 'clay', 'web'];
  let browsers: BCD.PlatformName[] = [];

  // Add browsers in platform order to align table cells
  for (const platform of platforms) {
    if (platform === 'native') {
      if (process.env.COMPAT_TABLE_HIDE_CLAY) {
        const regularNativeBrowsers = Object.keys(browserInfo).filter(
          (browser) => {
            const platformName = browser as BCD.PlatformName;
            return (
              browserInfo[platformName].type === 'native' &&
              platformName !== 'clay_macos' &&
              platformName !== 'clay_windows'
            );
          },
        );

        browsers.push(...(regularNativeBrowsers as BCD.PlatformName[]));

        if ('clay_macos' in browserInfo) {
          browsers.push('clay_macos');
        }
        if ('clay_windows' in browserInfo) {
          browsers.push('clay_windows');
        }
      } else {
        browsers.push(
          ...(Object.keys(browserInfo).filter((browser) => {
            const platformName = browser as BCD.PlatformName;
            return (
              browserInfo[platformName].type === 'native' &&
              !platformName.startsWith('clay_')
            );
          }) as BCD.PlatformName[]),
        );
      }
    } else if (platform === 'clay') {
      browsers.push(
        ...(Object.keys(browserInfo).filter((browser) => {
          const platformName = browser as BCD.PlatformName;
          return platformName.startsWith('clay_');
        }) as BCD.PlatformName[]),
      );
    } else {
      browsers.push(
        ...(Object.keys(browserInfo).filter((browser) => {
          const platformName = browser as BCD.PlatformName;
          return browserInfo[platformName].type === platform;
        }) as BCD.PlatformName[]),
      );
    }
  }

  // Filter WebExtension browsers in corresponding tables.
  if (category === 'webextensions') {
    browsers = browsers.filter(
      (browser) => browserInfo[browser].accepts_webextensions,
    );
  }

  // If there is no Node.js data for a category outside of "javascript", don't
  // show it. It ended up in the browser list because there is data for Deno.
  if (category !== 'javascript' && !hasNodeJSData) {
    browsers = browsers.filter((browser) => browser !== 'nodejs');
  }

  // Hide Internet Explorer compatibility data
  browsers = browsers.filter((browser) => !HIDDEN_BROWSERS.includes(browser));

  return [platforms, [...browsers]];
}

type CellIndex = [number, number];

function FeatureListAccordion({
  features,
  browsers,
  locale,
}: {
  features: ReturnType<typeof listFeatures>;
  browsers: BCD.PlatformName[];
  locale: string;
}) {
  const [[activeRow, activeColumn], dispatchCellToggle] = useReducer<
    React.Reducer<CellIndex | [null, null], CellIndex>
  >(
    ([activeRow, activeColumn], [row, column]) =>
      activeRow === row && activeColumn === column
        ? [null, null]
        : [row, column],
    [null, null],
  );

  return (
    <>
      {features.map((feature, i) => (
        <FeatureRow
          key={i}
          {...{ feature, browsers }}
          index={i}
          activeCell={activeRow === i ? activeColumn : null}
          onToggleCell={([row, column]: [number, number]) => {
            dispatchCellToggle([row, column]);
          }}
          locale={locale}
        />
      ))}
    </>
  );
}

export default function CompatibilityTable({
  query,
  module,
  data,
  browsers: browserInfo,
  locale,
}: {
  query: string;
  module?: string;
  data: BCD.Identifier;
  browsers: BCD.Platforms;
  locale: string;
}) {
  const location = useLocation();
  const t = useI18n();

  if (!data || !Object.keys(data).length) {
    throw new Error('CompatibilityTable component called with empty data');
  }

  const { __compat: compat } = data;
  // Try to find source_file in data, then __compat
  const sourceFile = (data as any).source_file || compat?.source_file;
  const path = sourceFile
    ? `packages/lynx-compat-data/${sourceFile}`
    : module
      ? `packages/lynx-compat-data/${module}.json`
      : undefined;

  // Try to find description_url in data, then __compat
  const descriptionUrl =
    (data as any).description_url || compat?.description_url;

  // Try to find lynx_path in data, then __compat
  const lynxPath = (data as any).lynx_path || compat?.lynx_path;
  const lynxDocUrl =
    lynxPath && !location.pathname.endsWith(lynxPath)
      ? withBase(`/${lynxPath}`)
      : undefined;

  const breadcrumbs = query.split('.');
  const category = breadcrumbs[0];
  const name = breadcrumbs[breadcrumbs.length - 1];

  const [platforms, browsers] = gatherPlatformsAndBrowsers(
    category,
    data,
    browserInfo,
  );

  function getNewIssueURL() {
    const url = 'https://github.com/mdn/browser-compat-data/issues/new';
    const sp = new URLSearchParams();
    const metadata = ISSUE_METADATA_TEMPLATE.replace(
      /\$DATE/g,
      new Date().toISOString(),
    )
      .replace(/\$QUERY_ID/g, query)
      .trim();
    sp.set('mdn-url', `https://developer.mozilla.org${location.pathname}`);
    sp.set('metadata', metadata);
    sp.set('title', `${query} - <SUMMARIZE THE PROBLEM>`);
    sp.set('template', 'data-problem.yml');
    return `${url}?${sp.toString()}`;
  }

  return (
    <BrowserCompatibilityErrorBoundary>
      <BrowserInfoContext.Provider value={browserInfo}>
        <div className="flex justify-end items-center mb-2">
          <div className="flex gap-2 text-sm">
            {path && <EditThis path={path} />}
            {lynxDocUrl && (
              <a
                href={lynxDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[var(--custom-link-color)] hover:opacity-85"
              >
                <span>{t('api.reference')}</span>
                <span className="text-xs">↗</span>
              </a>
            )}
            {descriptionUrl && (
              <a
                href={descriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[var(--custom-link-color)] hover:opacity-85"
              >
                <span>MDN</span>
                <span className="text-xs">↗</span>
              </a>
            )}
          </div>
        </div>
        {/* <a
          className="bc-github-link external external-icon"
          href={getNewIssueURL()}
          target="_blank"
          rel="noopener noreferrer"
          title="Report an issue with this compatibility data"
        >
          Report problems with this compatibility data on GitHub
        </a> */}
        <figure className="table-container">
          <figure className="table-container-inner">
            <table key="bc-table" className="bc-table bc-table-web">
              <Headers
                platforms={platforms}
                browsers={browsers}
                browserInfo={browserInfo}
              />
              <tbody>
                <FeatureListAccordion
                  browsers={browsers}
                  features={listFeatures(data, '', name)}
                  locale={locale}
                />
              </tbody>
            </table>
          </figure>
        </figure>
        <Legend compat={data} name={name} />

        {/* https://github.com/mdn/yari/issues/1191 */}
        <div className="hidden">
          The compatibility table on this page is generated from structured
          data. If you'd like to contribute to the data, please check out{' '}
          <a href="https://github.com/mdn/browser-compat-data">
            https://github.com/mdn/browser-compat-data
          </a>{' '}
          and send us a pull request.
        </div>
      </BrowserInfoContext.Provider>
    </BrowserCompatibilityErrorBoundary>
  );
}
