// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useState } from '@lynx-js/react';

import {
  FormField,
  FormRoot,
  FormSubmitButton,
  KeyboardAwareResponder,
  KeyboardAwareRoot,
  KeyboardAwareTrigger,
} from '@lynx-js/lynx-ui';

import { demoItems } from './data';

import './index.css';

const initialValues = Object.fromEntries(
  demoItems
    .filter((item) => item.type === 'input' || item.type === 'textarea')
    .map((item) => [item.name, '']),
) as Record<string, string>;

function App() {
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );

  return (
    <view className="container lunaris-dark luna-gradient-berry">
      <KeyboardAwareRoot androidStatusBarPlusBottomBarHeight={74}>
        <FormRoot initialValues={initialValues}>
          <KeyboardAwareResponder as="ScrollView" className="canvas">
            <view className="form-container">
              <text className="form-title">Keyboard-aware Form</text>
              <text className="form-subtitle">
                Form fields stay visible while typing in a long scroll.
              </text>

              <view className="divider" />

              {demoItems.map((item) => {
                if (item.type === 'block') {
                  return <view key={item.key} className="block" />;
                }

                if (item.type === 'input') {
                  return (
                    <KeyboardAwareTrigger key={item.key} offset={0}>
                      <view className="card">
                        <text className="label">{item.label}</text>
                        <view className="input-container">
                          <FormField
                            as="Input"
                            name={item.name}
                            className="form-input"
                            placeholder={item.placeholder}
                          />
                        </view>
                      </view>
                    </KeyboardAwareTrigger>
                  );
                }

                return (
                  <KeyboardAwareTrigger key={item.key} offset={0}>
                    <view className="card">
                      <text className="label">{item.label}</text>
                      <view className="textarea-wrap">
                        <FormField
                          as="TextArea"
                          name={item.name}
                          className="textarea"
                          placeholder={item.placeholder}
                          maxLines={12}
                          maxLength={600}
                        />
                      </view>
                    </view>
                  </KeyboardAwareTrigger>
                );
              })}

              <view className="divider" />

              <FormSubmitButton
                className="submit-button"
                onSubmit={(values) => setSubmitted(values)}
              >
                <text className="submit-button-text">Submit</text>
              </FormSubmitButton>

              {submitted ? (
                <view className="form-values-display">
                  <text className="form-values-text">
                    {JSON.stringify(submitted, null, 2)}
                  </text>
                </view>
              ) : null}

              <view className="bottom-spacer" />
            </view>
          </KeyboardAwareResponder>
        </FormRoot>
      </KeyboardAwareRoot>
    </view>
  );
}

root.render(<App />);
export default App;
