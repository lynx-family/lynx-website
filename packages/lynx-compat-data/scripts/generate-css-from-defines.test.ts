import { describe, expect, it } from 'vitest';

import { addSourceMetadata } from './generate-css-from-defines.js';

describe('addSourceMetadata', () => {
  it('adds source metadata to parent and nested compatibility statements', () => {
    const data = {
      property: {
        __compat: { support: {} },
        value: {
          __compat: { support: {} },
        },
      },
    };

    addSourceMetadata(data, {
      source_url: 'https://example.com/property.json',
    });

    expect(data.property.__compat).toMatchObject({
      source_url: 'https://example.com/property.json',
    });
    expect(data.property.value.__compat).toMatchObject({
      source_url: 'https://example.com/property.json',
    });
  });
});
