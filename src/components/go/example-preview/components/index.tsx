import React, { FC, useMemo, useRef, useState } from 'react';
import { useI18n, useLang } from 'rspress/runtime';
import {
  Space,
  Typography,
  Switch,
  Button,
  SideSheet,
  Resizable,
  RadioGroup,
  Radio,
  Select,
  Toast,
  Tabs,
  TabPane,
} from '@douyinfe/semi-ui';
import { QRCodeSVG } from 'qrcode.react';

import { FileTree } from './file-tree';
import { CodeView } from './code-view';
import { WebIframe } from './web-iframe';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import {
  IconList,
  IconChevronRightStroked,
  IconHandle,
} from '@douyinfe/semi-icons';
import { IconGithub, IconCopyLink } from '../utils/icon';
import { isSupportWebExplorer } from '../utils/tool';
import { useTreeController } from '../hooks/use-tree-controller';

import s from './index.module.scss';

const EXAMPLE_BASE_URL =
  'https://github.com/lynx-family/lynx-examples/tree/main';

enum PreviewType {
  Preview = 'Preview',
  QRCode = 'QRCode',
  Web = 'Web',
}

interface ExampleContentProps {
  fileNames: string[];
  previewImage: string;
  currentFileName: string;
  currentFile: string;
  updateCurrentName: (v: string) => void;
  isAssetFile: boolean;
  name: string;
  directory: string;
  currentEntryFileUrl: string;
  currentEntry: string;
  entryFiles: { name: string; file: string }[];
  setCurrentEntry: (v: string) => void;
  highlight?: string;
  entry?: string;
  defaultWebPreviewFile?: string;
  initState: boolean;
}

export const ExampleContent: FC<ExampleContentProps> = ({
  fileNames,
  previewImage,
  currentFileName,
  currentFile,
  updateCurrentName,
  isAssetFile,
  name,
  directory,
  currentEntryFileUrl,
  currentEntry,
  setCurrentEntry,
  entryFiles,
  highlight,
  entry,
  defaultWebPreviewFile,
  initState,
}) => {
  const { treeData, doChangeExpand, selectedKeys, expandedKeys, entryData } =
    useTreeController({ fileNames, value: currentFileName, entry });
  const [showPreview, setShowPreview] = useState(true);
  const [showFileTree, setShowFileTree] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewType, setPreviewType] = useState(
    previewImage ? PreviewType.Preview : PreviewType.QRCode,
  );
  const { hasPreview, hasWebPreview } = useMemo(() => {
    const count =
      Number(Boolean(previewImage)) +
      Number(Boolean(currentEntry)) +
      Number(Boolean(defaultWebPreviewFile));
    return {
      hasPreview: count >= 1,
      hasWebPreview: isSupportWebExplorer() && Boolean(defaultWebPreviewFile),
    };
  }, [previewImage, currentEntry, defaultWebPreviewFile]);
  const [tmpCurrentFileName, setTmpCurrentFileName] = useState('');
  const t = useI18n();
  const lang = useLang();

  const getContainer = () => containerRef.current as HTMLDivElement;
  const onFileSelect = (v: string) => {
    setShowFileTree(false);
    updateCurrentName(v);
    if (!entryData?.find((val) => val.value === v)) {
      setTmpCurrentFileName(v);
    }
  };

  const isVideo = (filename: string) => {
    let ext = filename.split('.').pop();
    if (!ext) {
      return false;
    }
    ext = ext.toLowerCase();
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
    if (videoExtensions.includes(ext)) {
      return true;
    }
    return false;
  };
  const showCodeTab = entryData && entryData?.length > 1;
  return (
    <div className={s.box}>
      <div className={s.container} ref={containerRef}>
        <div className={s.content}>
          <div className={s['code-wrap']}>
            <div className={s['code-tab-container']}>
              {showCodeTab && (
                <div
                  className={s['code-tab']}
                  ref={(tabsRef) => {
                    // scroll to active tab
                    if (tabsRef) {
                      const activeTab = tabsRef.querySelector(
                        '.semi-tabs-tab-active',
                      ) as HTMLElement;
                      const scrollContainer =
                        activeTab?.parentNode as HTMLElement;
                      if (activeTab && scrollContainer) {
                        const scrollLeft =
                          activeTab.offsetLeft -
                          (scrollContainer.clientWidth -
                            activeTab.offsetWidth) /
                            2;
                        scrollContainer.scrollTo({
                          left: scrollLeft,
                          behavior: 'auto',
                        });
                      }
                    }
                  }}
                >
                  <Tabs
                    activeKey={currentFileName}
                    onChange={(v) => updateCurrentName(v)}
                    size="small"
                    preventScroll={true}
                    onTabClose={() => {
                      updateCurrentName(entryData[entryData.length - 1].value);
                      setTmpCurrentFileName('');
                    }}
                  >
                    {entryData.map((file) => (
                      <TabPane
                        key={file.value}
                        itemKey={file.value}
                        tab={file.label}
                      />
                    ))}
                    {tmpCurrentFileName && (
                      <TabPane
                        key={tmpCurrentFileName}
                        itemKey={tmpCurrentFileName}
                        tab={tmpCurrentFileName?.split('/').pop()}
                        closable={true}
                      />
                    )}
                  </Tabs>
                </div>
              )}
              <div
                className={`${s['code-view-container']} ${showCodeTab ? s['code-view-container-tab-show'] : ''}`}
              >
                <CodeView
                  currentFileName={currentFileName}
                  currentFile={currentFile}
                  isAssetFile={isAssetFile}
                  highlight={highlight}
                />
              </div>
            </div>
          </div>

          <Resizable
            style={{
              display: hasPreview && showPreview ? 'block' : 'none',
            }}
            enable={{
              top: false,
              right: false,
              bottom: false,
              topLeft: false,
              topRight: false,
              bottomLeft: false,
              bottomRight: false,
              left: true,
            }}
            defaultSize={{
              width: 280,
            }}
            minWidth={200}
            maxWidth={600}
            handleStyle={{
              left: {
                left: '-8px',
                width: '8px',
              },
            }}
            handleNode={{
              left: (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconHandle
                    style={{ fontSize: '12px', marginLeft: '-2px' }}
                  />
                </div>
              ),
            }}
          >
            <div className={s['preview-wrap']}>
              <div className="w-full h-full flex flex-col items-center">
                {
                  <RadioGroup
                    onChange={(e) => setPreviewType(e.target.value)}
                    value={previewType}
                    type="button"
                    style={{
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    {initState ? (
                      <>
                        {previewImage && (
                          <Radio value={PreviewType.Preview}>
                            {t('go.preview')}
                          </Radio>
                        )}
                        {hasWebPreview && (
                          <Radio value={PreviewType.Web}>Web</Radio>
                        )}
                        {currentEntry && (
                          <Radio value={PreviewType.QRCode}>
                            {t('go.qrcode')}
                          </Radio>
                        )}
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '32px' }}></div>
                    )}
                  </RadioGroup>
                }
                {previewType === PreviewType.QRCode && currentEntry && (
                  <div className={s.qrcode} style={{ minHeight: '0px' }}>
                    <Typography.Text
                      size="small"
                      type="tertiary"
                      style={{ margin: '28px 12px', textAlign: 'center' }}
                    >
                      {t('go.scan.message-1')}
                      <Typography.Text
                        link={{
                          href:
                            lang === 'zh'
                              ? `/${lang}/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator`
                              : '/guide/start/quick-start.html#download-lynx-explorer,ios-simulator-platform=macos-arm64,explorer-platform=ios-simulator',
                          target: '_blank',
                        }}
                        size="small"
                        underline
                      >
                        Lynx Explorer
                      </Typography.Text>
                      {t('go.scan.message-2')}
                    </Typography.Text>
                    <div className={s['qrcode-svg']}>
                      <QRCodeSVG value={currentEntryFileUrl} />
                    </div>
                    <div style={{ marginBottom: '32px' }}>
                      <CopyToClipboard
                        onCopy={() => {
                          Toast.success(t('go.qrcode.copied'));
                        }}
                        text={currentEntryFileUrl}
                      >
                        <Button
                          type="tertiary"
                          style={{ fontSize: '12px' }}
                          icon={<IconCopyLink style={{ fontSize: '16px' }} />}
                        >
                          {t('go.qrcode.copy-link')}
                        </Button>
                      </CopyToClipboard>
                    </div>
                    <div className={s['qrcode-entry']}>
                      <Typography.Text
                        size="small"
                        type="tertiary"
                        style={{ marginRight: '12px', flexShrink: 0 }}
                      >
                        {t('go.qrcode.entry')}
                      </Typography.Text>
                      <Select
                        style={{ width: '100%', maxWidth: '200px' }}
                        value={currentEntry}
                        onChange={(v) => setCurrentEntry(v as string)}
                      >
                        {entryFiles.map((file) => (
                          <Select.Option key={file.name} value={file.name}>
                            {file.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}
                {previewImage && (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      minHeight: '0px',
                      display:
                        previewType === PreviewType.Preview ? 'flex' : 'none',
                    }}
                  >
                    {isVideo(previewImage) ? (
                      <video
                        muted
                        loop
                        playsInline
                        autoPlay
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      >
                        <source src={previewImage} />
                      </video>
                    ) : (
                      <img
                        src={previewImage}
                        alt=""
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>
                )}
                {hasWebPreview && (
                  <WebIframe
                    show={previewType === PreviewType.Web}
                    src={defaultWebPreviewFile || ''}
                  />
                )}
              </div>
            </div>
          </Resizable>
        </div>
        <div className={s.footer}>
          <Space
            spacing={2}
            className="max-w-full overflow-hidden whitespace-nowrap"
          >
            <Button
              theme="borderless"
              icon={<IconList style={{ color: 'var(--semi-color-text-2)' }} />}
              type="tertiary"
              size="small"
              onClick={() => setShowFileTree(true)}
            />
            <Space spacing={2} className="overflow-hidden">
              <Typography.Text
                size="small"
                type="tertiary"
                ellipsis={{ showTooltip: true }}
              >
                {name}
              </Typography.Text>
              <IconChevronRightStroked
                style={{ color: 'var(--semi-color-text-2)', fontSize: '12px' }}
              />
              <Typography.Text
                size="small"
                type="tertiary"
                ellipsis={{ showTooltip: true }}
              >
                {currentFileName}
              </Typography.Text>
            </Space>
          </Space>
          <Space spacing={7}>
            {hasPreview && (
              <Space spacing={6}>
                <Typography.Text size="small" type="tertiary">
                  {t('go.preview')}
                </Typography.Text>

                <Switch
                  style={{
                    backgroundColor: showPreview
                      ? 'var(--semi-color-info)'
                      : 'var(--semi-color-fill-0)',
                    cursor: 'pointer',
                  }}
                  checked={showPreview}
                  onChange={setShowPreview}
                  size="small"
                />
              </Space>
            )}

            <Button
              theme="borderless"
              icon={
                <IconGithub style={{ color: 'var(--semi-color-text-2)' }} />
              }
              type="tertiary"
              size="small"
              onClick={() => {
                window.open(
                  `${EXAMPLE_BASE_URL}/${directory}/${currentFileName}`,
                  '_blank',
                );
              }}
            />
          </Space>
        </div>
        <SideSheet
          width={224}
          placement="left"
          visible={showFileTree}
          onCancel={() => setShowFileTree(false)}
          getPopupContainer={getContainer}
          closeIcon={null}
          closable={false}
          title={<Typography.Text>{t('go.files')}</Typography.Text>}
          headerStyle={{
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            padding: '12px 24px',
            fontSize: '16px',
            borderBottom: '1px solid var(--semi-color-border)',
          }}
          bodyStyle={{
            padding: '12px',
          }}
        >
          <FileTree
            onSelect={onFileSelect}
            entry={entry}
            treeData={treeData}
            doChangeExpand={doChangeExpand}
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
          />
        </SideSheet>
      </div>
    </div>
  );
};
