import { describe, expect, it } from 'vitest';

import {
  addSourceMetadata,
  applyWebSupportOverrides,
} from './generate-css-from-defines.js';

describe('applyWebSupportOverrides', () => {
  it('replaces a nested Web statement without changing other platforms or its parent', () => {
    const data = {
      display: {
        __compat: { support: { web_lynx: { version_added: true } } },
        relative: {
          __compat: {
            source_url: 'https://example.com/display.json',
            support: {
              android: { version_added: '1.6' },
              web_lynx: { version_added: true, notes: 'Outdated note' },
            },
          },
        },
      },
    };
    applyWebSupportOverrides(data, [
      { path: ['display', 'relative'], support: { version_added: false } },
    ]);
    expect(data.display.relative.__compat).toEqual({
      source_url: 'https://example.com/display.json',
      source_file: 'web-css-support.json',
      support: {
        android: { version_added: '1.6' },
        web_lynx: { version_added: false },
      },
    });
    expect(data.display.__compat.support.web_lynx).toEqual({
      version_added: true,
    });
  });

  it('fails when an upstream property or feature is removed', () => {
    for (const path of [['removed'], ['display', 'removed']]) {
      expect(() =>
        applyWebSupportOverrides({ display: { __compat: { support: {} } } }, [
          { path, support: { version_added: false } },
        ]),
      ).toThrow(`Unknown Web CSS override: ${path.join('.')}`);
    }
  });
});

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
