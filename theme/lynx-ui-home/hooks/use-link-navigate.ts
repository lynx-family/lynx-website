// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { useCallback } from 'react';
import { useLang, useNavigate } from '@rspress/core/runtime';

export const useLinkNavigate = () => {
  const navigate = useNavigate();
  const lang = useLang() as 'en' | 'zh';
  const handleInteraction = useCallback(
    (path: string) => {
      navigate(lang === 'en' ? `/ui/${path}` : `/zh/ui/${path}`);
    },
    [navigate, lang],
  );

  return {
    linkNavigate: handleInteraction,
  };
};
