// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import {
  CheckboxIndicator,
  FormField,
  FormRoot,
  FormSubmitButton,
  Radio,
  RadioIndicator,
  ScrollView,
} from '@lynx-js/lynx-ui';

import { formPageData } from './data';

import './index.css';

function App() {
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  return (
    <view className="container lunaris-dark luna-gradient-berry">
      <ScrollView scrollOrientation="vertical" className="canvas">
        <FormRoot
          onChanged={(values: Record<string, unknown>) => setFormValues(values)}
          initialValues={{
            workspaceType: '',
            workspaceName: 'My Workspace',
            description: 'A place for collaboration',
          }}
        >
          <view className="form-container">
            <text className="form-title">{formPageData.title}</text>
            <text className="form-subtitle">{formPageData.subtitle}</text>

            <view className="divider" />

            <text className="form-section-title">Workspace type</text>
            <FormField as="RadioGroupRoot" name="workspaceType">
              <view className="radio-group-container">
                {formPageData.workspaceTypeOptions.map(({ label, value }) => (
                  <Radio className="radio-item" key={value} value={value}>
                    <RadioIndicator className="radio-indicator">
                      <view className="radio-indicator-checked-item" />
                    </RadioIndicator>
                    <text className="label">{label}</text>
                  </Radio>
                ))}
              </view>
            </FormField>

            <view className="divider" />

            <text className="form-section-title">Workspace name</text>
            <view className="input-container">
              <FormField
                as="Input"
                name="workspaceName"
                className="form-input"
              />
            </view>

            <text className="form-section-title">Description</text>
            <view className="input-container">
              <FormField as="Input" name="description" className="form-input" />
            </view>

            <view className="divider" />

            <FormField as="Checkbox" name="agreement" className="checkbox-item">
              <CheckboxIndicator className="checkbox-indicator">
                <view className="checkbox-indicator-checked-item" />
              </CheckboxIndicator>
              <text className="label">I agree to the terms and conditions</text>
            </FormField>

            <FormSubmitButton
              onSubmit={(e) => console.info(e)}
              className="submit-button"
            >
              <text className="submit-button-text">Submit</text>
            </FormSubmitButton>

            <view className="divider" />

            <text className="form-values-display">
              {JSON.stringify(formValues, null, 2)}
            </text>
          </view>
        </FormRoot>
      </ScrollView>
    </view>
  );
}
root.render(<App />);

export default App;
