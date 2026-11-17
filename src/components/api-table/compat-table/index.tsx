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
import { EditThis } from '../../EditThis';
import { BrowserInfoContext } from './browser-info';
import { BrowserCompatibilityErrorBoundary } from './error-boundary';
import { FeatureRow } from './feature-row';
import { Headers } from './headers';
// Include styles for direct use. FetchingCompatTable also imports this stylesheet
// eagerly so styles are available before the table's JavaScript is lazy-loaded.
import './index.scss';
import { Legend } from './legend';
import { isCurrentDocPath, localizeMdnUrl } from './links';
import { listFeatures } from './utils';

/**
 * Order Lynx platform groups and their support columns.
 * LCD platform metadata and the Clay visibility setting determine the columns.
 * BCD category rules for WebExtensions and Node.js/Deno do not apply.
 * Keep columns with missing support data so cells can report it as unknown.
 */
function gatherPlatformsAndBrowsers(
  browserInfo: LCD.Platforms,
): [string[], LCD.PlatformName[]] {
  const platforms: LCD.PlatformType[] = !!process.env.COMPAT_TABLE_HIDE_CLAY
    ? ['native', 'web']
    : ['native', 'clay', 'web'];
  const browsers: LCD.PlatformName[] = [];

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
  /** Locale used for platform release dates and MDN documentation links. */
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

  const mdnUrl = localizeMdnUrl(compat?.mdn_url, locale);
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
    <BrowserCompatibilityErrorBoundary>
      <BrowserInfoContext.Provider value={browserInfo}>
        <div className="lynx-compat-table">
          <div className="flex justify-end items-center mb-2">
            <div className="bc-reference-links flex gap-2 text-sm">
              {(sourceUrl || path) && (
                <EditThis path={path} sourceUrl={sourceUrl} />
              )}
              {lynxDocUrl && (
                <a
                  href={lynxDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bc-reference-link text-[var(--custom-link-color)] hover:opacity-85"
                >
                  {t('api.reference')}
                </a>
              )}
              {mdnUrl && (
                <a
                  href={mdnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bc-reference-link text-[var(--custom-link-color)] hover:opacity-85"
                >
                  MDN
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
          {/* Derive legend items from the same visible columns as the rows. */}
          <Legend compat={data} name={name} browsers={browsers} />
        </div>
      </BrowserInfoContext.Provider>
    </BrowserCompatibilityErrorBoundary>
  );
}
