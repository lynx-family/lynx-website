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
import type * as LCD from '@lynx-js/lynx-compat-data';
import { useLocation, withBase } from '@rspress/core/runtime';
import { useI18n } from '../../../hooks/use-i18n';
import { useReducer } from 'react';
import EditThis from '../../EditThis';
import { BrowserInfoContext } from './browser-info';
import { FeatureRow } from './feature-row';
import { Headers } from './headers';
import './index.scss';
import { Legend } from './legend';
import { isCurrentDocPath } from './links';
import { listFeatures } from './utils';

// Note! Don't import any SCSS here inside *this* component.
// It's done in the component that lazy-loads this component.

export const HIDDEN_BROWSERS = ['ie'];

/**
 * Order Lynx platform groups and their support columns.
 */
function gatherPlatformsAndBrowsers(
  browserInfo: LCD.Platforms,
): [string[], LCD.PlatformName[]] {
  const platforms: LCD.PlatformType[] = !!process.env.COMPAT_TABLE_HIDE_CLAY
    ? ['native', 'web']
    : ['native', 'clay', 'web'];
  let browsers: LCD.PlatformName[] = [];

  // Add browsers in platform order to align table cells
  for (const platform of platforms) {
    if (platform === 'native') {
      if (process.env.COMPAT_TABLE_HIDE_CLAY) {
        const regularNativeBrowsers = Object.keys(browserInfo).filter(
          (browser) => {
            const platformName = browser as LCD.PlatformName;
            return (
              browserInfo[platformName].type === 'native' &&
              platformName !== 'clay_macos' &&
              platformName !== 'clay_windows'
            );
          },
        );

        browsers.push(...(regularNativeBrowsers as LCD.PlatformName[]));

        if ('clay_macos' in browserInfo) {
          browsers.push('clay_macos');
        }
        if ('clay_windows' in browserInfo) {
          browsers.push('clay_windows');
        }
      } else {
        browsers.push(
          ...(Object.keys(browserInfo).filter((browser) => {
            const platformName = browser as LCD.PlatformName;
            return (
              browserInfo[platformName].type === 'native' &&
              !platformName.startsWith('clay_')
            );
          }) as LCD.PlatformName[]),
        );
      }
    } else if (platform === 'clay') {
      browsers.push(
        ...(Object.keys(browserInfo).filter((browser) => {
          const platformName = browser as LCD.PlatformName;
          return platformName.startsWith('clay_');
        }) as LCD.PlatformName[]),
      );
    } else {
      browsers.push(
        ...(Object.keys(browserInfo).filter((browser) => {
          const platformName = browser as LCD.PlatformName;
          return browserInfo[platformName].type === platform;
        }) as LCD.PlatformName[]),
      );
    }
  }

  // Hide Internet Explorer compatibility data
  browsers = browsers.filter((browser) => !HIDDEN_BROWSERS.includes(browser));

  return [platforms, [...browsers]];
}

type CellIndex = [number, number];

function toggleCell(
  [activeRow, activeColumn]: CellIndex | [null, null],
  [row, column]: CellIndex,
): CellIndex | [null, null] {
  return activeRow === row && activeColumn === column
    ? [null, null]
    : [row, column];
}

interface CompatibilityTableProps {
  /** Dot-separated accessor identifying the selected compatibility record. */
  query: string;
  /**
   * Package-relative JSON module containing the record. Used as the fallback
   * source path when the record does not declare more specific metadata.
   */
  module?: string;
  /** Compatibility record selected by `query`. */
  data: LCD.Identifier;
  /** Platform metadata used to order and label support columns. */
  browsers: LCD.Platforms;
  /** Locale used when formatting platform release dates. */
  locale: string;
}

function FeatureListAccordion({
  features,
  browsers,
  locale,
}: {
  features: ReturnType<typeof listFeatures>;
  browsers: LCD.PlatformName[];
  locale: string;
}) {
  const [[activeRow, activeColumn], dispatchCellToggle] = useReducer(
    toggleCell,
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

/**
 * Render a compatibility record with its platform support and related links.
 *
 * Source links prefer metadata attached to the selected record, allowing
 * generated data to point either to a local package file or to an upstream
 * source of truth. Documentation links back to the current page are omitted.
 */
export default function CompatibilityTable({
  query,
  module,
  data,
  browsers: browserInfo,
  locale,
}: CompatibilityTableProps) {
  const location = useLocation();
  const t = useI18n();

  if (!data || !Object.keys(data).length) {
    throw new Error('CompatibilityTable component called with empty data');
  }

  const { __compat: compat } = data;
  // Direct identifier metadata takes precedence over its compatibility block.
  const sourceFile =
    (typeof data.source_file === 'string' ? data.source_file : undefined) ||
    compat?.source_file;
  const sourceUrl =
    (typeof data.source_url === 'string' ? data.source_url : undefined) ||
    compat?.source_url;
  const path = sourceFile
    ? `packages/lynx-compat-data/${sourceFile}`
    : module
      ? `packages/lynx-compat-data/${module}.json`
      : undefined;

  const descriptionUrl =
    (typeof data.description_url === 'string'
      ? data.description_url
      : undefined) || compat?.mdn_url;
  const lynxPath =
    (typeof data.lynx_path === 'string' ? data.lynx_path : undefined) ||
    compat?.lynx_path;
  const lynxDocUrl =
    lynxPath && !isCurrentDocPath(location.pathname, lynxPath)
      ? withBase(`/${lynxPath}`)
      : undefined;

  const breadcrumbs = query.split('.');
  const name = breadcrumbs[breadcrumbs.length - 1];

  const [platforms, browsers] = gatherPlatformsAndBrowsers(browserInfo);

  return (
    <BrowserInfoContext.Provider value={browserInfo}>
      <div className="lynx-compat-table">
        <div className="flex justify-end items-center mb-2">
          <div className="flex gap-2 text-sm">
            {(sourceUrl || path) && (
              <EditThis path={path} sourceUrl={sourceUrl} />
            )}
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
        <Legend compat={data} name={name} browsers={browsers} />

        {/* https://github.com/mdn/yari/issues/1191 */}
        <div className="hidden">
          The compatibility table on this page is generated from structured
          data. If you'd like to contribute to the data, please check out{' '}
          <a href="https://github.com/mdn/browser-compat-data">
            https://github.com/mdn/browser-compat-data
          </a>{' '}
          and send us a pull request.
        </div>
      </div>
    </BrowserInfoContext.Provider>
  );
}
