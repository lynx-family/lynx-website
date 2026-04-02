// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useLang, usePageData } from '@rspress/core/runtime';
import { useEffect } from 'react';

const newsConfig = {
  zh: 'lynx-ui v3 版本正式发布',
  en: 'lynx-ui v3 is officially released',
};

const useNewsButton = () => {
  const { page } = usePageData();
  const lang = useLang() as 'en' | 'zh';

  useEffect(() => {
    if (page.pageType !== 'home') return;

    const badgeElement = document.querySelector('.rp-home-hero__badge');
    const titleElement = document.querySelector('.rp-home-hero__title');

    if (!badgeElement || !titleElement) return;

    badgeElement.className =
      'rp-home-hero__badge lynx-ui-blog-btn-frame active-hover';
    badgeElement.textContent = newsConfig[lang];
    badgeElement.setAttribute('style', 'opacity: 1;');

    return () => {
      // Cleanup if needed
    };
  }, [lang]);
};

export { useNewsButton };
