import React from 'react';
import { useDark } from '@rspress/core/runtime';

/**
 * Props for the Image component
 */
interface IProp {
  /** URL of the image */
  src: string;
  darkSrc: string;
  /** Optional style for image */
  imageStyle?: React.CSSProperties;
}

/**
 * Image component for displaying dark image
 * @param props The component props
 * @returns A React component
 */
export const Image = ({ src, darkSrc, imageStyle }: IProp) => {
  const dark = useDark();
  const url = dark ? darkSrc : src;
  return <img src={url} style={imageStyle}></img>;
};
