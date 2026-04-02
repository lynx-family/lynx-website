// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { root, useEffect, useState } from '@lynx-js/react';

import { Button } from '@lynx-js/lynx-ui';
import { clsx } from 'clsx';

import './index.css';

function App() {
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const disabled = timer < 1;

  return (
    <view className="container lunaris-dark">
      <text className="countdown">
        This Button will be disabled after{' '}
        <text className="countdown-timer">{timer}</text> s
      </text>
      <Button
        onClick={() => console.info('clicked')}
        disabled={disabled}
        className="button-root"
      >
        {({ active = false }) => (
          <view
            className={clsx('button', {
              active: active,
              disabled: disabled,
            })}
          >
            <text className="text">Click Me!</text>
          </view>
        )}
      </Button>
    </view>
  );
}

root.render(<App />);

export default App;
