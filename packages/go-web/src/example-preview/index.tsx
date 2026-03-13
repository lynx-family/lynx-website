import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { ExampleContent } from './components';
import { isAssetFileType } from './utils/example-data';
import type { SchemaOptionsData } from './hooks/use-switch-schema';
import { withBase } from '@rspress/core/runtime';
import { useGoConfig } from '../config';
import type { PreviewTab } from '../config';

const DefaultErrorWrap = ({
  example,
  exampleBaseUrl,
}: {
  example: string;
  exampleBaseUrl: string;
}) => {
  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e74c3c',
        borderRadius: '8px',
        background: '#fdf0ef',
      }}
    >
      <strong>Error Loading Example Data</strong>
      <p>
        Error loading Example data for example: <code>{example}</code>
        <br />
        Please check if the file <code>example-metadata.json</code> exists in{' '}
        <code>
          {exampleBaseUrl}/{example}
        </code>{' '}
        .
      </p>
    </div>
  );
};

export interface ExamplePreviewProps {
  example: string;
  defaultFile: string;
  img?: string;
  defaultEntryFile?: string;
  defaultEntryName?: string;
  highlight?: string | Record<string, string>;
  entry?: string | string[];
  schema?: string;
  rightFooter?: React.ReactNode;
  schemaOptions?: SchemaOptionsData;
  langAlias?: Record<string, string>;
  /**
   * Override the default preview tab for this instance.
   * Takes precedence over the site-level `GoConfig.defaultTab`.
   *
   * - `'preview'` — static screenshot (requires `img`)
   * - `'web'`     — live web preview (requires `webFile` in metadata)
   * - `'qrcode'`  — QR code for Lynx Explorer
   */
  defaultTab?: PreviewTab;
}

interface ExampleMetadata {
  name: string;
  files: string[];
  templateFiles: Array<{
    name: string;
    file: string;
    webFile?: string;
  }>;
  previewImage?: string;
  exampleGitBaseUrl?: string;
}

export const ExamplePreview = (props: ExamplePreviewProps) => {
  const {
    exampleBasePath,
    ErrorComponent,
    SSGComponent,
    defaultTab: configDefaultTab,
  } = useGoConfig();
  const EXAMPLE_BASE_URL = withBase(exampleBasePath);

  if (import.meta.env.SSG_MD && SSGComponent) {
    return <SSGComponent {...props} />;
  }

  const {
    example,
    defaultFile = 'package.json',
    defaultEntryFile,
    defaultEntryName,
    highlight,
    img,
    entry,
    schema,
    rightFooter,
    schemaOptions,
    langAlias,
    defaultTab: propsDefaultTab,
  } = props;

  // Instance prop > config provider > undefined (let ExampleContent decide)
  const defaultTab = propsDefaultTab ?? configDefaultTab;

  const [currentName, setCurrentName] = useState(defaultFile);
  const [currentFile, setCurrentFile] = useState('');
  const [isAssetFile, setIsAssetFile] = useState(isAssetFileType(defaultFile));
  const [currentEntry, setCurrentEntry] = useState('');

  const [defaultWebPreviewFile, setDefaultWebPreviewFile] = useState('');
  const [initState, setInitState] = useState(false);
  const storeRef = useRef<Record<string, string>>({});
  const highlightData = useMemo(() => {
    return typeof highlight === 'string'
      ? { [defaultFile]: highlight }
      : highlight || {};
  }, [highlight, defaultFile]);

  const { error, data: exampleData } = useSWR<ExampleMetadata>(
    `${EXAMPLE_BASE_URL}/${example}/example-metadata.json`,

    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response.status.toString());
      }
      return await response.json();
    },
    { revalidateOnFocus: false },
  );

  const { trigger } = useSWRMutation(
    `${EXAMPLE_BASE_URL}/${example}/${currentName}`,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response.status.toString());
      }
      const text = await response.text();
      return text;
    },
  );
  const updateCurrentName = (v: string) => {
    setCurrentName(v);
    setIsAssetFile(isAssetFileType(v));
  };
  useEffect(() => {
    if (isAssetFile) {
      setCurrentFile(`${EXAMPLE_BASE_URL}/${example}/${currentName}`);
    } else {
      if (storeRef.current[currentName]) {
        setCurrentFile(storeRef.current[currentName]);
      } else {
        trigger().then((res) => {
          setCurrentFile(res);
          storeRef.current[currentName] = res;
        });
      }
    }
  }, [currentName, isAssetFile]);

  const currentEntryFileUrl = useMemo(() => {
    const file = exampleData?.templateFiles?.find(
      (file) => file.name === currentEntry,
    );
    if (file) {
      const url = `${window.location.origin}${EXAMPLE_BASE_URL}/${example}/${file?.file}`;
      if (schema) {
        const schemaUrl = schema.replace('{{{url}}}', url);
        return schemaUrl;
      }
      return url;
    }
    return '';
  }, [exampleData, currentEntry, schema]);
  useEffect(() => {
    if (exampleData?.templateFiles && exampleData?.templateFiles.length > 0) {
      let tmpEntry;
      // if defaultEntryFile is provided, use it, if not, use defaultEntryName, if not, use the first file
      if (defaultEntryFile) {
        const entry =
          exampleData?.templateFiles.find(
            (file) => file.file === defaultEntryFile,
          ) ||
          exampleData?.templateFiles.find((file) =>
            file.file.startsWith(defaultEntryFile),
          );
        if (entry) {
          tmpEntry = entry;
        }
      } else if (defaultEntryName) {
        const entry = exampleData?.templateFiles.find(
          (file) => file.name === defaultEntryName,
        );
        if (entry) {
          tmpEntry = entry;
        }
      } else {
        tmpEntry = exampleData?.templateFiles[0];
      }
      if (tmpEntry) {
        if (tmpEntry.webFile) {
          const fullWebFile = `${window.location.origin}${EXAMPLE_BASE_URL}/${example}/${tmpEntry.webFile}`;
          setDefaultWebPreviewFile(fullWebFile);
        }
        setCurrentEntry(tmpEntry.name);
      } else {
        console.warn(
          'defaultEntryFile or defaultEntryName params error, please check!',
        );
      }
      setInitState(true);
    }
  }, [exampleData, defaultEntryFile, defaultEntryName]);

  if (error) {
    const ErrorComp = ErrorComponent || DefaultErrorWrap;
    return <ErrorComp example={example} exampleBaseUrl={EXAMPLE_BASE_URL} />;
  }

  return (
    <ExampleContent
      name={example}
      directory={exampleData?.name}
      isAssetFile={isAssetFile}
      updateCurrentName={updateCurrentName}
      currentFile={currentFile}
      currentFileName={currentName}
      fileNames={exampleData?.files || []}
      previewImage={
        img ||
        (exampleData?.previewImage
          ? `${EXAMPLE_BASE_URL}/${example}/${exampleData?.previewImage}`
          : '')
      }
      langAlias={langAlias}
      currentEntryFileUrl={currentEntryFileUrl}
      currentEntry={currentEntry}
      setCurrentEntry={setCurrentEntry}
      entryFiles={exampleData?.templateFiles}
      highlight={highlightData[currentName]}
      entry={entry}
      defaultWebPreviewFile={defaultWebPreviewFile}
      initState={initState}
      rightFooter={rightFooter}
      schemaOptions={schema ? undefined : schemaOptions}
      exampleGitBaseUrl={exampleData?.exampleGitBaseUrl}
      defaultTab={defaultTab}
    />
  );
};
