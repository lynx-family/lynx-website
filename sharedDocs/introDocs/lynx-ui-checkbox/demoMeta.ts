export const checkboxBasicDemoMeta = {
  highlight: '{31-40,49-61,70-82}',
  description:
    'highlight uncontrolled, controlled, and disabled checkbox patterns',
  content: [
    '<Checkbox className="checkbox" onChange={...}>',
    '  <CheckboxIndicator className="checkbox-indicator">...</CheckboxIndicator>',
    '</Checkbox>',
    '<Checkbox checked={checked} onChange={setChecked}>...</Checkbox>',
    '<Checkbox disabled checked className="checkbox">...</Checkbox>',
  ],
};

export const checkboxInterdeterminateDemoMeta = {
  highlight: '{54-64}',
};
