import { root } from '@lynx-js/react';

import { PlanPicker } from './PlanPicker.jsx';

root.render(<PlanPicker />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
