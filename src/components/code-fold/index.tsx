import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import React, { useCallback, useRef, useState } from 'react';
import './index.scss';
import { useDark } from '@rspress/core/runtime';
import { Button } from '@douyinfe/semi-ui';
import { IconExpand, IconShrink } from '@douyinfe/semi-icons';

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
  const dark = useDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('example');
  const [toggleHeight, setToggleHeight] = useState<number | undefined>(
    undefined,
  );

  const doBackToView = useCallback(() => {
    if (containerRef.current) {
      const offsetTop = document.documentElement.scrollTop;
      const top = containerRef.current.getBoundingClientRect().top;

      document.documentElement.scrollTo({
        top: offsetTop + top - containerRef.current.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, []);

  const doToggle = useCallback(() => {
    if (!toggleHeight && !!toggleRef.current) {
      setToggleHeight(toggleRef.current?.clientHeight);
    } else {
      setToggleHeight(undefined);
      setTimeout(() => {
        doBackToView();
      }, 0);
    }
  }, [toggleHeight]);

  return (
    <div
      style={{ marginBottom: 10 }}
      className={`${dark ? 'semi-always-dark' : 'semi-always-light'}`}
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
              className="rounded-lg"
              style={{
                position: 'relative',
                aspectRatio: (16 / 9) * (1 / 0.25),
                overflow: !toggle ? 'scroll' : 'hidden',
                height: toggleHeight ?? Math.max(setHeight ?? 0, 300),
              }}
            >
              {toggle && toggleHeight === undefined && (
                <div className={`area-footer-mask ${dark ? 'dark' : ''}`} />
              )}
              {toggle && (
                <Button
                  onClick={doToggle}
                  className="btn-frame"
                  icon={toggleHeight ? <IconShrink /> : <IconExpand />}
                ></Button>
              )}
              <div className="code-in-tab" ref={toggleRef}>
                {children}
              </div>
            </ResizablePanel>
            {img && <ResizableHandle className="mx-2" />}
            {img && (
              <ResizablePanel defaultSize={25} className="overflow-hidden">
                <div
                  className="image-frame"
                  style={{
                    height: toggleHeight ?? Math.max(setHeight ?? 0, 300),
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
