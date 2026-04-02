// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export interface FormPageProps {
  title: string;
  subtitle: string;
  workspaceTypeOptions: RadioOption[];
  initialFormData: FormData;
}

export interface RadioOption {
  label: string;
  value: string;
}

export interface FormData {
  workspaceType: string;
  workspaceName: string;
  description: string;
}

export const formPageData: FormPageProps = {
  title: 'Create a workspace',
  subtitle: 'Set up your workspace to get started.',
  workspaceTypeOptions: [
    { label: 'Personal', value: 'personal' },
    { label: 'Team', value: 'team' },
  ],
  initialFormData: {
    workspaceType: '',
    workspaceName: '',
    description: '',
  },
};
