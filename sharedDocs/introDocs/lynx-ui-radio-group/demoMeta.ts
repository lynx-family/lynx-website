export const radioGroupBasicDemoMeta = {
  highlight: '{21-41}',
  description: 'controlled RadioGroupRoot with mapped Radio options',
  content: [
    '<RadioGroupRoot value={value} onValueChange={setValue}>',
    "  <view className='radio-group-root'>",
    '    {radioTags.map(tag => (...<Radio value={tag} radioProps={hitSlop}>...</Radio>...))}',
    '  </view>',
    '</RadioGroupRoot>',
  ],
};

export const radioGroupDisabledDemoMeta = {
  highlight: '{32-36,42-51}',
  description: 'group-level disabled and per-item disabled options',
  content: [
    '<RadioGroupRoot value={value} onValueChange={setValue} disabled={disabled}>',
    '  ...',
    '<Radio className="radio-item" value={tag} disabled={itemDisabled} radioProps={hitSlop}>',
    '  <RadioIndicator className="radio-indicator">...</RadioIndicator>',
    '</Radio>',
    '</RadioGroupRoot>',
  ],
};
