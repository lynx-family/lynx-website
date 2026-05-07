export const buttonBasicDemoMeta = {
  highlight: '{18-36}',
  description: 'highlight active-state render props and custom button content',
  content: [
    "<Button onClick={() => console.info('clicked')} className='button-root'>",
    '  {({ active = false }) => (',
    "    <view className={clsx('button', { active })}>...</view>",
    '  )}',
    '</Button>',
  ],
};
