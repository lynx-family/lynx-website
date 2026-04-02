// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useI18n, usePageData } from '@rspress/core/runtime';
import { Button } from '@lynx/ui/Button';

interface Props {
  /**
   * If path is not provided, we will use the current page path and assume it's a `md` or `mdx` file.
   */
  path?: string;
}

const BASE_URL = 'https://code.byted.org/lynx/internal_website/blob/master';

/**
 * TODO(xuan.huang):
 * - [] tweak the style
 * - [] use it within the new APITable
 */
export default function EditThis({ path }: Props) {
  const pageData = usePageData();
  const t = useI18n();

  let sourcePath = '';
  if (!path) {
    sourcePath = `${BASE_URL}/docs/${pageData.page.pagePath}`;
  } else {
    sourcePath = `${BASE_URL}/${path}`;
  }

  // The CloudIDE URL is as simple as replace `code.` with `dev.`
  const cloudIDEUrl = sourcePath.replace('code.', 'dev.');

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">
        <a href={sourcePath}>{t('edit.source')}</a>
      </Button>
      <Button variant="outline" size="sm">
        <a href={cloudIDEUrl}>{t('edit.cloud-ide')}</a>
      </Button>
    </div>
  );
}
