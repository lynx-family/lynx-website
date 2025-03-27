import React, { useState } from 'react';
import { Typography } from '@douyinfe/semi-ui';

import { Code } from './code';
import { getFileCodeLanguage, isImgType } from '../utils/example-data';

interface CodeViewProps {
  currentFileName: string;
  currentFile: string;
  isAssetFile: boolean;
  highlight?: string;
}

export const CodeView = ({
  currentFileName,
  currentFile,
  isAssetFile,
  highlight,
}: CodeViewProps) => {
  const [isFirstShowCode, setIsFirstShowCode] = useState(true);
  if (isAssetFile) {
    if (isImgType(currentFileName)) {
      return (
        <div className="sh-flex sh-items-center sh-justify-center sh-w-full sh-h-full sh-overflow-auto">
          <img src={currentFile} alt="" />
        </div>
      );
    }
    return (
      <div className="sh-flex sh-items-center sh-justify-center sh-w-full sh-h-full">
        <Typography.Text type="secondary">{currentFileName}</Typography.Text>
      </div>
    );
  }
  const language = getFileCodeLanguage(currentFileName);

  return (
    <Code
      highlight={highlight}
      val={currentFile}
      language={language}
      isFirstShowCode={isFirstShowCode}
      setIsFirstShowCode={setIsFirstShowCode}
    />
  );
};
