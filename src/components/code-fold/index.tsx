import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import './index.scss';
import { useDark } from '@rspress/core/runtime';

/**
 * Props for the CodeFold component
 */
interface IProp {
  /** Optional URL of the example image */
  img?: string;
  /** Optional number for code-area\image-area height */
  height?: number;
  /** Optional boolean for toggle code-area\image-area */
  toggle?: boolean;
  /** Child components to render */
  children: React.ReactNode;
  /** Optional style for image frame */
  imageFrameStyle?: React.CSSProperties;
}

/**
 * CodeFold component for displaying code examples with an optional image
 * @param props The component props
 * @returns A React component
 */
export const CodeFold = ({
  img,
  children,
  height: setHeight,
  imageFrameStyle,
  toggle = false,
}: IProp) => {
  if (import.meta.env.SSG_MD) {
    return <>{children}</>;
  }
  const dark = useDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('example');
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const collapsedHeight = Math.max(setHeight ?? 0, 300);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setContentHeight(el.scrollHeight);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const needsFold =
    toggle && contentHeight > 0 && contentHeight > collapsedHeight;
  const panelHeight = needsFold && expanded ? contentHeight : collapsedHeight;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      if (prev) {
        setTimeout(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            if (rect.top < 0) {
              containerRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }
          }
        }, 0);
      }
      return !prev;
    });
  }, []);

  return (
    <div
      className={`code-fold-wrapper ${dark ? 'semi-always-dark' : 'semi-always-light'}`}
      ref={containerRef}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent
          forceMount={true}
          value="example"
          hidden={activeTab !== 'example'}
          className="w-full overflow-hidden"
        >
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              defaultSize={75}
              style={{
                position: 'relative',
                aspectRatio: (16 / 9) * (1 / 0.25),
                overflow: 'hidden',
                height: panelHeight,
                transition: needsFold
                  ? 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                  : undefined,
              }}
            >
              <div className="codefold-scroll-area">
                <div className="code-in-tab" ref={contentRef}>
                  {children}
                </div>
              </div>

              {needsFold && (
                <div
                  className={`codefold-gradient-overlay ${dark ? 'dark' : ''}`}
                  style={{ opacity: expanded ? 0 : 1 }}
                />
              )}

              {needsFold && (
                <button
                  onClick={handleToggle}
                  className={`codefold-toggle-btn ${dark ? 'dark' : ''}`}
                  aria-label={expanded ? 'Collapse code' : 'Expand code'}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="codefold-toggle-icon"
                    style={{
                      transform: expanded ? 'rotate(180deg)' : undefined,
                    }}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{expanded ? 'Collapse' : 'Expand'}</span>
                </button>
              )}
            </ResizablePanel>
            {img && <ResizableHandle className="mx-2" />}
            {img && (
              <ResizablePanel defaultSize={25} className="overflow-hidden">
                <div
                  className="image-frame"
                  style={{
                    height: panelHeight,
                    transition: needsFold
                      ? 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                      : undefined,
                    ...imageFrameStyle,
                  }}
                >
                  <img
                    src={img}
                    alt="Example visualization"
                    className="w-full h-auto border border-solid rounded-lg border-slate-200"
                  />
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </TabsContent>
      </Tabs>
    </div>
  );
};
