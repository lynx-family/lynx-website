// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export type DemoItemType = 'block' | 'input' | 'textarea';

interface DemoItemBase {
  key: string;
  type: DemoItemType;
}

export interface BlockItem extends DemoItemBase {
  type: 'block';
}

export interface InputItem extends DemoItemBase {
  type: 'input';
  name: string;
  label: string;
  placeholder: string;
}

export interface TextAreaItem extends DemoItemBase {
  type: 'textarea';
  name: string;
  label: string;
  placeholder: string;
}

export type DemoItem = BlockItem | InputItem | TextAreaItem;

export const demoItems = [
  { type: 'block', key: 'spacer-intro' },
  {
    type: 'input',
    key: 'field-title',
    name: 'title',
    label: 'Title',
    placeholder: 'Type here',
  },

  { type: 'block', key: 'spacer-1' },

  {
    type: 'input',
    key: 'field-subtitle',
    name: 'subtitle',
    label: 'Subtitle',
    placeholder: 'Type here',
  },

  { type: 'block', key: 'spacer-2' },

  {
    type: 'input',
    key: 'field-email',
    name: 'email',
    label: 'Email',
    placeholder: 'name@example.com',
  },

  { type: 'block', key: 'spacer-3' },

  {
    type: 'input',
    key: 'field-phone',
    name: 'phone',
    label: 'Phone',
    placeholder: '+1 234 567 890',
  },

  { type: 'block', key: 'spacer-4' },

  {
    type: 'input',
    key: 'field-website',
    name: 'website',
    label: 'Website',
    placeholder: 'https://',
  },

  { type: 'block', key: 'spacer-5' },

  {
    type: 'textarea',
    key: 'field-description',
    name: 'description',
    label: 'Description(TextArea)',
    placeholder: 'Write something...',
  },

  { type: 'block', key: 'spacer-outro' },

  {
    type: 'input',
    key: 'field-tag',
    name: 'tag',
    label: 'Tag',
    placeholder: 'e.g. demo',
  },

  { type: 'block', key: 'spacer-tail' },
] as const satisfies readonly DemoItem[];
