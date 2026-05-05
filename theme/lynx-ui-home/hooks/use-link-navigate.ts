// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useCallback } from 'react';
import { useLang, useNavigate, usePage } from '@rspress/core/runtime';

export const useLinkNavigate = () => {
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';
  const { page } = usePage();
  const handleInteraction = useCallback(
    (path: string) => {
      if (
        page.pagePath.startsWith('en/lynx-ui') ||
        page.pagePath.startsWith('zh/lynx-ui')
      ) {
        navigate(lang === 'en' ? `/en/lynx-ui/${path}` : `/zh/lynx-ui/${path}`);
      } else {
        navigate(lang === 'en' ? `/en/${path}` : `/zh/${path}`);
      }
    },
    [navigate, lang, page.pagePath],
  );

  return {
    linkNavigate: handleInteraction,
  };
};
