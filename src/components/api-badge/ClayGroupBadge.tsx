import { useState } from 'react';
import { Badge } from '@rspress/core/theme';

import type LCD from '@lynx-js/lynx-compat-data';
import { getFullPlatformName } from '@lynx-js/lynx-compat-data';
import { PlatformSvg } from '../platform-navigation/PlatformIcon';

import './ClayGroupBadge.css';

type ClayVariant = 'clay_android' | 'clay_ios' | 'clay_macos' | 'clay_windows';

type ClayGroupBadgeProps = {
  variants: ClayVariant[];
  version?: LCD.VersionValue;
};

/**
 * Umbrella badge for the Clay platform family, used when APIBadge runs in
 * `expandable` mode. Default state renders a single "Clay v+" chip; hover
 * reveals the per-variant icons inline (CSS-only); click toggles to the
 * explicit variant name list.
 *
 * Caller groups variants by version before constructing this — each
 * ClayGroupBadge represents one cohort of variants that share the same
 * version_added value.
 */
export function ClayGroupBadge({ variants, version }: ClayGroupBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const versionLabel = typeof version === 'string' ? `${version}+` : null;

  return (
    <span
      className={`platform-badge-clay clay-group-badge${
        expanded ? ' clay-group-badge--expanded' : ''
      }`}
      style={{ display: 'contents' }}
    >
      <Badge type="info">
        <span
          className="clay-group-badge__chip"
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
        >
          <PlatformSvg
            platformName="clay"
            className="platform-badge__icon clay-group-badge__umbrella-icon"
          />
          {expanded ? (
            <span className="clay-group-badge__names">
              {variants
                .map((v) => getFullPlatformName(v as LCD.PlatformName))
                .join(', ')}
            </span>
          ) : (
            <>
              <span className="clay-group-badge__label">Clay</span>
              <span className="clay-group-badge__icons" aria-hidden="true">
                {variants.map((v) => (
                  <PlatformSvg
                    key={v}
                    platformName={v}
                    className="platform-badge__icon clay-group-badge__variant-icon"
                  />
                ))}
              </span>
            </>
          )}
          {versionLabel ? (
            <span className="clay-group-badge__version">{versionLabel}</span>
          ) : null}
        </span>
      </Badge>
    </span>
  );
}
