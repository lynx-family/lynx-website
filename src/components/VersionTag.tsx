/**
 * This is a compatibility layer for the old version tags API.
 * @deprecated
 * @see ./api-badge/index.ts
 */

/** @deprecated */
export { Deprecated, Experimental, Required } from './api-badge/StatusBadge';

// Compatibility layer for the old import usages
/** @deprecated */
export {
  AndroidOnly,
  ClayOnly,
  NoClay as ClayUnavailable,
  IOSOnly,
  HarmonyOnly,
  NoClay,
} from './api-badge/PlatformBadge';

/**
 * @deprecated
 * Use `VersionBadge` instead.
 */
import { VersionBadge as VersionTag } from './api-badge/VersionBadge';

/** @deprecated */
export const Version14 = () => <VersionTag>1.4</VersionTag>;
/** @deprecated */
export const Version15 = () => <VersionTag>1.5</VersionTag>;
/** @deprecated */
export const Version16 = () => <VersionTag>1.6</VersionTag>;
/** @deprecated */
export const Version20 = () => <VersionTag>2.0</VersionTag>;
/** @deprecated */
export const Version21 = () => <VersionTag>2.1</VersionTag>;
/** @deprecated */
export const Version22 = () => <VersionTag>2.2</VersionTag>;
/** @deprecated */
export const Version23 = () => <VersionTag>2.3</VersionTag>;
/** @deprecated */
export const Version24 = () => <VersionTag>2.4</VersionTag>;
/** @deprecated */
export const Version25 = () => <VersionTag>2.5</VersionTag>;
/** @deprecated */
export const Version25dot5 = () => <VersionTag>2.5.5</VersionTag>;
/** @deprecated */
export const Version26 = () => <VersionTag>2.6</VersionTag>;
/** @deprecated */
export const Version27 = () => <VersionTag>2.7</VersionTag>;
/** @deprecated */
export const Version28 = () => <VersionTag>2.8</VersionTag>;
/** @deprecated */
export const Version29 = () => <VersionTag>2.9</VersionTag>;
/** @deprecated */
export const Version210 = () => <VersionTag>2.10</VersionTag>;
/** @deprecated */
export const Version211 = () => <VersionTag>2.11</VersionTag>;
/** @deprecated */
export const Version212 = () => <VersionTag>2.12</VersionTag>;
/** @deprecated */
export const Version213 = () => <VersionTag>2.13</VersionTag>;
/** @deprecated */
export const Version214 = () => <VersionTag>2.14</VersionTag>;
/** @deprecated */
export const Version215 = () => <VersionTag>2.15</VersionTag>;
/** @deprecated */
export const Version216 = () => <VersionTag>2.16</VersionTag>;
/** @deprecated */
export const Version217 = () => <VersionTag>2.17</VersionTag>;
/** @deprecated */
export const Version218 = () => <VersionTag>2.18</VersionTag>;
/** @deprecated */
export const Version31 = () => <VersionTag>3.1</VersionTag>;
/** @deprecated */
export const Version32 = () => <VersionTag>3.2</VersionTag>;
