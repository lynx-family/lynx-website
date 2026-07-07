export const inputBasicDemoMeta = {
  highlight: '{35-40,45-51,60-63}',
  description: 'uncontrolled & controlled input and textarea usage',
  content: [
    '<Input',
    '  ref={uncontrolledInputRef}',
    "  className='input'",
    "  placeholder='Uncontrolled'",
    '  defaultValue={uncontrolledValueRef.current}',
    '/>',
    '<Input',
    '  ref={controlledInputRef}',
    "  className='input'",
    "  placeholder='Controlled'",
    '  value={controlledValue}',
    '  onInput={setControlledValue}',
    '/>',
    '<TextArea',
    "  className='textarea'",
    "  placeholder='Write something...'",
    '/>',
  ],
};

export const inputKeyboardAwareDemoMeta = {
  highlight: '{23-81}',
  description: 'keyboard-aware inputs with focus jump',
  content: [
    '<KeyboardAwareRoot androidStatusBarPlusBottomBarHeight={74}>',
    "  <KeyboardAwareResponder className='canvas' style={{ height: 'auto' }}>",
    "    <view className='section'>...</view>",
    `    <KeyboardAwareTrigger offset={0}>...<Input placeholder="inputId: 'input0'" onInput={...} />...</KeyboardAwareTrigger>`,
    `    <KeyboardAwareTrigger>...<Input placeholder="Type 'next' to focus input2" onInput={...} />...</KeyboardAwareTrigger>`,
    `    <KeyboardAwareTrigger>...<Input ref={input2Ref} ... />...</KeyboardAwareTrigger>`,
    "    <KeyboardAwareTrigger offset={0}>...<TextArea className='textarea' ... />...</KeyboardAwareTrigger>",
    '  </KeyboardAwareResponder>',
    '</KeyboardAwareRoot>',
  ],
};
