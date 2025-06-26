import type { CSSProperties, PropsWithChildren } from 'react';
import './Mermaid.scss';

import type { MermaidConfig } from 'mermaid';
import { useCallback, useEffect, useId, useState } from 'react';
import { useDark } from '@rspress/core/runtime';

interface Props {
  style?: CSSProperties;
  title?: string;
  config?: MermaidConfig;
}

export default function Mermaid({
  style,
  children,
  title,
  config,
}: PropsWithChildren<Props>) {
  const id = useId();
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState(false);
  const dark = useDark();

  const renderMermaid = useCallback(
    async function renderMermaid2SVG() {
      const { default: mermaid } = await import('mermaid');
      const mermaidConfig: MermaidConfig = {
        securityLevel: 'loose',
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        ...config,
      };

      try {
        mermaid.initialize(mermaidConfig);

        const { svg } = await mermaid.render(
          id.replace(/:/g, ''),
          children as string,
        );

        setSvg(svg);
      } catch (error) {
        setRenderError(true);
        console.error(error);
      }
    },
    [children, config, dark, id],
  );

  useEffect(() => {
    renderMermaid();
  }, [renderMermaid]);
  return (
    <>
      {renderError || !svg ? null : (
        <div style={style} className="lynx-mermaid">
          <h3>{title}</h3>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </>
  );
}
