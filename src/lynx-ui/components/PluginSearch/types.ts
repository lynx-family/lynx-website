// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export enum pluginType {
  any = 'any',
  transformer = 'transformer',
  resolver = 'resolver',
  bundler = 'bundler',
  namer = 'namer',
  runtime = 'runtime',
  packager = 'packager',
  optimizer = 'optimizer',
  compressor = 'compressor',
  validator = 'validator',
  config = 'config',
  reporter = 'reporter',
  analyzer = 'analyzer',
}
interface pluginInfoBnpmPackage {
  name: string;
  type: number[];
  isOfficial: boolean;
  isBnpmPackage: true;
}
interface pluginInfoIntegrated {
  name: string;
  type: number[];
  isOfficial: boolean;
  isBnpmPackage: false;
  description: string;
  link: string;
  latestVersion?: string;
  downloadCount?: number;
  modifiedDate?: string;
}

export type pluginInfo = pluginInfoBnpmPackage | pluginInfoIntegrated;

export interface pluginInfoForDisplay {
  name: string;
  type: number[];
  latestVersion: string;
  description: string;
  link: string;
  modifiedDate: string;
  isOfficial: boolean;
  isBnpmPackage: boolean;
}
