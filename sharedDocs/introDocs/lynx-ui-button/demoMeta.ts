export const buttonBasicDemoMeta = {
  highlight: '{19-27,29-34}',
  description: 'highlight active-state render props and custom button content',
  content: [
    "<Button onClick={() => console.info('clicked')} className='button-root'>",
    '  {({ active = false }) => (',
    "    <view className={clsx('button', { active })}>...</view>",
    '  )}',
    '</Button>',
  ],
};
