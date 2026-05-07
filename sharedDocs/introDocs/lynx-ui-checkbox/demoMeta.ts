export const checkboxBasicDemoMeta = {
  highlight: '{31-39,48-60,69-81}',
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
