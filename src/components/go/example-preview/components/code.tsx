import React, { FC, useEffect, useRef, useState } from 'react';
import { getCustomMDXComponent } from '@theme';

import { getHighlightLines } from '../utils/example-data';

interface CodeProps {
  val: string;
  language: string;
  highlight?: string; // {1,3-5}
  isFirstShowCode: boolean;
  setIsFirstShowCode: (isFirstShowCode: boolean) => void;
}

export const Code: FC<CodeProps> = ({
  val,
  language,
  highlight,
  isFirstShowCode,
  setIsFirstShowCode,
}) => {
  const Comp = getCustomMDXComponent();
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightVal, setHighlightVal] = useState(highlight);
  const defaultValRef = useRef(val);
  useEffect(() => {
    if (!val) {
      return;
    }
    if (isFirstShowCode) {
      if (containerRef.current && highlight) {
        const highlightLines = getHighlightLines(highlight);
        const firstHighlight = highlightLines[0];
        setIsFirstShowCode(false);
        if (firstHighlight > 3) {
          if (firstHighlight && containerRef.current) {
            const firstHighlightElement = containerRef.current.querySelector(
              `pre.code > code > span:nth-of-type(${firstHighlight - 2})`,
            );

            if (firstHighlightElement) {
              const container = containerRef.current.parentElement;
              if (container) {
                const offsetTop =
                  firstHighlightElement.getBoundingClientRect().top -
                  containerRef.current.getBoundingClientRect().top;
                container.scrollTo({ top: offsetTop, behavior: 'smooth' });
              }
            }
          }
        }
        defaultValRef.current = val;
      }
    } else {
      if (defaultValRef.current) {
        defaultValRef.current = '';
        return;
      }
      if (containerRef.current) {
        const container = containerRef.current.parentElement;
        // fix scroll to top flicker
        setTimeout(() => {
          if (container) {
            container.scrollTo({ top: 0, behavior: 'auto' });
          }
        }, 0);
      }
    }
  }, [val, highlight, isFirstShowCode]);

  // fixed tab change highlight delay
  useEffect(() => {
    setHighlightVal(highlight);
  }, [highlight]);
  return (
    <div ref={containerRef}>
      <Comp.pre>
        <Comp.code
          meta={highlightVal}
          className={`language-${language}`}
          codeHighlighter="prism"
          codeWrap={false}
        >
          {val}
        </Comp.code>
      </Comp.pre>
    </div>
  );
};
