export const checkboxBasicDemoMeta = {
  highlight: '{23-32,41-53,62-66,70-74}',
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

export const checkboxIndeterminateDemoMeta = {
  highlight: '{46-56,63-72}',
  description: 'select-all checkbox with indeterminate state and item list',
  content: [
    '<Checkbox className="checkbox" checked={allSelected} indeterminate={indeterminate} onChange={handleSelectAll} checkboxProps={hitSlop}>',
    '  <CheckboxIndicator className="checkbox-indicator">...</CheckboxIndicator>',
    '</Checkbox>',
    '<Checkbox className="checkbox" checked={selected.includes(fruit)} onChange={(checked) => handleItem(fruit, checked)} checkboxProps={hitSlop}>...</Checkbox>',
  ],
};
