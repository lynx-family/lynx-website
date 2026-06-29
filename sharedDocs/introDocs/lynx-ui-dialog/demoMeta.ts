export const dialogBasicDemoMeta = {
  highlight: '{25-56}',
  description:
    'highlight controlled state, trigger, backdrop, content, and close action',
  content: [
    'const [show, setShow] = useState(true)',
    '<DialogRoot show={show} onShowChange={setShow}>',
    '  <DialogTrigger />',
    '  <DialogView>',
    '    <DialogBackdrop />',
    '    <DialogContent>',
    '      <DialogClose />',
    '    </DialogContent>',
    '  </DialogView>',
    '</DialogRoot>',
  ],
};
