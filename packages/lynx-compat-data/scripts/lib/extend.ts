/* This file is a part of @mdn/lynx-compat-data
 * See LICENSE file for more information. */

/**
 * Error class for duplicate compat statements during object merge
 */
class DuplicateCompatError extends Error {
  /**
   * Construct the error
   * @param feature The feature path
   */
  constructor(feature: string) {
    super(`${feature} already exists! Remove duplicate entries.`);
    this.name = 'DuplicateCompatError';
  }
}

/**
 * Check if the variable is an object ({})
 * @param v The object to test
 * @returns Whether the object is a plain object
 */
type PlainObject = Record<string, unknown>;

const isPlainObject = (v: unknown): v is PlainObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Combine two objects containing platform compat data together
 * @param target The object to extend
 * @param source The object to copy from
 * @param feature The feature path so far (internal for recursive calls)
 */
const extend = (
  target: PlainObject,
  source: PlainObject,
  feature = '',
): void => {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    throw new Error('Both target and source must be plain objects');
  }

  // iterate over own enumerable properties
  for (const [key, value] of Object.entries(source)) {
    // recursively extend if target has the same key, otherwise just assign
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (key == '__compat') {
        // If attempting to merge __compat, we have a double-entry
        throw new DuplicateCompatError(feature);
      }
      const targetValue = target[key];
      if (!isPlainObject(targetValue) || !isPlainObject(value)) {
        throw new Error('Both target and source values must be plain objects');
      }
      extend(targetValue, value, feature + `${feature ? '.' : ''}${key}`);
    } else {
      target[key] = value;
    }
  }
};

export default extend;
