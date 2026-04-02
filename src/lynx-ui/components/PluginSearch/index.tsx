// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  Input,
  List,
  Space,
  Select,
  Switch,
  Popover,
  Button,
} from '@arco-design/web-react';
import { useCallback, useEffect, useState } from 'react';
import {
  IconClockCircle,
  IconSync,
  IconSafe,
} from '@arco-design/web-react/icon';
import {
  pluginType,
  type pluginInfo,
  type pluginInfoForDisplay,
} from './types';
import { NoSSR } from '@rspress/core/runtime';
const InputSearch = Input.Search;
const Option = Select.Option;
const domain = 'https://ambitious-drawer-rsxzai.cn.goofy.app';

export type IPluginSearchProps = {};

export default function PluginSearch(_props: IPluginSearchProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [searchType, setSearchType] = useState(pluginType.any);
  const [searchOfficialOnly, setSearchOfficialOnly] = useState(false);
  const allPluginTypes = Object.keys(pluginType).filter((v) =>
    isNaN(Number(v)),
  );

  const _millify = function (num: number): string {
    if (Number.isNaN(Number(num))) return '';
    const millifyLevel = [
      {
        threshold: 1,
        unit: '',
      },
      {
        threshold: 1000,
        unit: 'K',
      },
      {
        threshold: 1000000,
        unit: 'M',
      },
      {
        threshold: 1000000000,
        unit: 'B',
      },
    ].sort((a, b) => {
      return b.threshold - a.threshold;
    });
    for (let i = 0; i < millifyLevel.length; i++) {
      const currLevel = millifyLevel[i];
      const newNum = Math.floor(num / currLevel.threshold);
      if (Number.isNaN(newNum)) {
        return num.toString();
      }
      if (newNum > 0) {
        return `${newNum} ${currLevel.unit}`;
      }
    }
  };
  const queryPluginsByName = useCallback((name, pluginType, isOfficial) => {
    return fetch(
      `${domain}/pluginSearch?pluginName=${name}&pluginType=${pluginType}&isOfficial=${isOfficial}`,
      {
        method: 'GET',
      },
    ).then((res) => {
      if (res.ok) {
        return res.json() as Promise<pluginInfo[] | undefined>;
      }
    });
  }, []);
  const queryPackageBnpm = useCallback((name) => {
    return fetch(`${domain}/bnpmProxy/package/${encodeURIComponent(name)}`, {
      method: 'GET',
    }).then((res) => {
      if (res.ok) {
        return res.json();
      }
    });
  }, []);
  const fillBnpmPackageInfo = useCallback(
    (pluginInfoForDisplay: pluginInfoForDisplay) => {
      return queryPackageBnpm(pluginInfoForDisplay.name).then((bnpmResult) => {
        if (bnpmResult) {
          const id = bnpmResult['_id'];
          if (id) {
            const description = bnpmResult['description'];
            const latestVersion = bnpmResult['dist-tags']?.latest;
            const modifiedDate = bnpmResult['time']
              ? bnpmResult['time'][latestVersion]
              : '';
            pluginInfoForDisplay.description = description;
            pluginInfoForDisplay.latestVersion = latestVersion;
            pluginInfoForDisplay.modifiedDate = modifiedDate;
          }
        }
        return pluginInfoForDisplay;
      });
    },
    [queryPackageBnpm],
  );

  const updateSearchResult = useCallback(
    async (pluginList: pluginInfo[]) => {
      if (pluginList) {
        const pluginListForDisplay = pluginList.map((e) => {
          return {
            ...e,
            description: e.isBnpmPackage ? '' : e['description'],
            latestVersion: 'click the title',
            modifiedDate: 'click the title',
            link: e.isBnpmPackage
              ? `https://bnpm.bytedance.net/package/${e.name}`
              : e['link'],
          } as pluginInfoForDisplay;
        });
        const pluginSearchResult: pluginInfoForDisplay[] = Array(
          pluginListForDisplay.length,
        );
        for (let i = 0; i < pluginListForDisplay.length; i++) {
          try {
            pluginSearchResult[i] = await fillBnpmPackageInfo(
              pluginListForDisplay[i],
            );
          } catch (_e) {
            pluginSearchResult[i] = pluginListForDisplay[i];
          }
        }
        setLoading(false);
        setSearchResult(pluginSearchResult);
      }
    },
    [setSearchResult, fillBnpmPackageInfo, setLoading],
  );

  useEffect(() => {
    return () => {
      queryPluginsByName('', pluginType.any, false).then((pluginList) => {
        updateSearchResult(pluginList);
      });
    };
  }, [updateSearchResult]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setSearchResult([]);
      queryPluginsByName(searchText, searchType, searchOfficialOnly).then(
        (pluginList) => {
          updateSearchResult(pluginList);
        },
      );
    }, 500); // wait 0.5 sec for user typing.
    return () => clearTimeout(delaySearch);
  }, [
    searchText,
    searchType,
    searchOfficialOnly,
    setLoading,
    setSearchResult,
    updateSearchResult,
  ]);

  return (
    <NoSSR>
      <Space direction="vertical">
        <Space direction="horizontal" style={{ width: 800 }}>
          <Select
            placeholder="Please select"
            onChange={(value) => {
              setLoading(true);
              setSearchType(value);
            }}
            defaultValue={searchType}
            style={{ width: 100 }}
          >
            {allPluginTypes.map((option, _index) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
          <InputSearch
            loading={loading}
            placeholder="Enter keyword to search"
            style={{ width: 350 }}
            onChange={(value) => {
              setLoading(true);
              setSearchText(value);
            }}
          />
          <div>
            <Switch
              checked={searchOfficialOnly}
              onChange={(value) => {
                setLoading(true);
                setSearchOfficialOnly(value);
              }}
            />
            <span>Official Plugin Only</span>
          </div>
        </Space>
        <List
          style={{ width: 800 }}
          dataSource={searchResult}
          loading={loading}
          render={(item: pluginInfoForDisplay, index) => (
            <List.Item
              key={index}
              extra={
                <Space direction="vertical" style={{ width: 200 }}>
                  <Space direction="horizontal">
                    <IconClockCircle />
                    <text>{item.latestVersion}</text>
                  </Space>
                  <Space direction="horizontal">
                    <IconSync />
                    <text>{item.modifiedDate?.split('T')[0]}</text>
                  </Space>
                </Space>
              }
            >
              <List.Item.Meta
                title={
                  <>
                    <a href={item.link}>{item.name}</a>
                    {item.isOfficial ? (
                      <Popover
                        trigger="hover"
                        content={
                          <span>
                            <p style={{ margin: 0 }}>Official plugin</p>
                          </span>
                        }
                      >
                        <Button type="text" icon={<IconSafe />} />
                      </Popover>
                    ) : (
                      <></>
                    )}
                  </>
                }
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Space>
    </NoSSR>
  );
}
