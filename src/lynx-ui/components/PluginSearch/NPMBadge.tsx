// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { type FC, useEffect, useState } from 'react';
import { domain } from './api';

interface Props {
  /**
   * The name of the npm package
   */
  name: string;

  /**
   * The version of the npm package. If not provided, will use {@link tag} to search on bnpm.
   */
  version?: string;

  /**
   * The npm dist-tag to search.
   * @default 'latest'
   */
  tag?: string;

  /**
   * The style of the badge.
   * @default 'flat-square'
   * @see https://shields.io/badges/static-badge
   */
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';

  /**
   * The color of the badge.
   * @default 'green'
   * @see https://shields.io/badges/static-badge
   */
  color?: string;
}

export const NPMBadge: FC<Props> = (props) => {
  const {
    name,
    color = 'green',
    tag = 'latest',
    style = 'flat-square',
  } = props;
  const [version, setVersion] = useState(props.version);

  useEffect(() => {
    if (props.version) {
      return;
    }

    (async () => {
      const res = await fetch(
        `${domain}/bnpmProxy/package/${encodeURIComponent(name)}`,
      );
      const { 'dist-tags': versions } = await res.json();

      setVersion(versions[tag ?? 'latest']);
    })();
  }, [name, props.version, tag]);

  return version ? (
    <a href={`https://bnpm.bytedance.net/package/${name}`} target="_blank">
      <img
        src={`https://img.shields.io/badge/bnpm@${encodeURIComponent(
          tag,
        )}-${encodeURIComponent(version)}-${color}?logo=npm&style=${style}`}
      />
    </a>
  ) : null;
};
