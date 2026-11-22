import { z } from 'zod';

import { defineWebsiteResource } from '../registration';
import { gitTagName, releaseAssetName } from './schemas/github';

export const lynxResources = {
  'lynx.releases.tag': defineWebsiteResource({
    params: z.strictObject({ tag: gitTagName }),
    resolve: ({ tag }) =>
      `https://github.com/lynx-family/lynx/releases/tag/${encodeURIComponent(tag)}`,
    bind: ({ LYNX_VERSION }) => ({ tag: LYNX_VERSION }),
    label: ({ tag }) => `GitHub Release ${tag}`,
  }),
  'lynx.releases.download': defineWebsiteResource({
    params: z.strictObject({ tag: gitTagName, asset: releaseAssetName }),
    resolve: ({ tag, asset }) =>
      `https://github.com/lynx-family/lynx/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset)}`,
    bind: ({ LYNX_VERSION }) => ({ tag: LYNX_VERSION }),
    label: ({ asset }) => asset,
  }),
};
