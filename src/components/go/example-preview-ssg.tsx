import fs from 'fs';
import path from 'path';
import { useMemo } from 'react';
import { ExamplePreviewSSG as GoExamplePreviewSSG } from '@lynx-js/go-web/ssg';
import type { ExamplePreviewProps } from '@lynx-js/go-web';
import { useGoConfig } from '@lynx-js/go-web';

export function ExamplePreview(props: ExamplePreviewProps) {
  const { ssgExampleRoot } = useGoConfig();
  const version = useMemo(() => {
    if (!ssgExampleRoot) return undefined;
    try {
      const metadata = JSON.parse(
        fs.readFileSync(
          path.join(ssgExampleRoot, props.example, 'example-metadata.json'),
          'utf8',
        ),
      );
      return metadata.version as string | undefined;
    } catch {
      return undefined;
    }
  }, [props.example, ssgExampleRoot]);

  return (
    <>
      <GoExamplePreviewSSG {...props} />
      {version && (
        <p style={{ color: 'var(--semi-color-text-2)', fontSize: '12px' }}>
          Example version: {version}
        </p>
      )}
    </>
  );
}
