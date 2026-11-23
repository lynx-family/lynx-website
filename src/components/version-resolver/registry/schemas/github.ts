import { z } from 'zod';

// Release endpoints accept tag names, not source revisions. Hex-only names of
// 4–64 characters are rejected as ambiguous with short/full SHA-1 or SHA-256 IDs.
export const gitTagName = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !/^[0-9a-f]{4,64}$/i.test(value) &&
      value !== '@' &&
      !value.startsWith('-') &&
      !value.endsWith('.') &&
      !/[\u0000-\u0020\u007f~^:?*\[\\]/.test(value) &&
      !value.includes('..') &&
      !value.includes('@{') &&
      value
        .split('/')
        .every(
          (part) =>
            part.length > 0 && !part.startsWith('.') && !part.endsWith('.lock'),
        ),
    'Expected a Git tag name, not a revision expression or commit SHA',
  )
  .describe('Unencoded Git release tag; SHA-shaped names are unsupported');

export const releaseAssetName = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value !== '.' &&
      value !== '..' &&
      !/[/\\\u0000-\u001f\u007f]/.test(value),
    'Expected a single release asset filename',
  )
  .describe('Unencoded release asset filename');
