import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import './Mermaid.scss';

import type { MermaidConfig } from 'mermaid';
import { isValidElement, useCallback, useEffect, useId, useState } from 'react';
import { useDark } from '@rspress/core/runtime';

interface Props {
  style?: CSSProperties;
  title?: string;
  config?: MermaidConfig;
}

function toMermaidCode(children: ReactNode): string {
  if (
    children === null ||
    children === undefined ||
    typeof children === 'boolean'
  ) {
    return '';
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(toMermaidCode).filter(Boolean).join('\n');
  }

  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    return toMermaidCode(props.children);
  }

  return '';
}

export default function Mermaid({
  style,
  children,
  title,
  config,
}: PropsWithChildren<Props>) {
  const code = toMermaidCode(children).trim();

  if (import.meta.env.SSG_MD) {
    return (
      <>
        {title ? `**${title}**\n` : ''}
        {code}
      </>
    );
  }
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

        const { svg } = await mermaid.render(id.replace(/:/g, ''), code);

        setSvg(svg);
        setRenderError(false);
      } catch (error) {
        setRenderError(true);
        console.error(error);
      }
    },
    [code, config, dark, id],
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
