export const sheetBasicDemoMeta = {
  highlight: '{26-56}',
  description:
    'highlight the trigger, SheetRoot composition, backdrop, content, handle, and close action',
  content: [
    '<TriggerButton onClick={() => sheetRef.current?.open()} />',
    '<SheetRoot ref={sheetRef} snapPoints={snapPoints}>',
    '  <SheetBackdrop clickToClose={true} />',
    '  <SheetContent>',
    '    <SheetHandle />',
    '    <ActionButton onClick={() => sheetRef.current?.close()} />',
    '  </SheetContent>',
    '</SheetRoot>',
  ],
};

export const sheetAutoHeightDemoMeta = {
  highlight: '{18-19,48-50,57-72}',
  description:
    'highlight the fit snap point and content-driven SheetContent body',
  content: [
    "const snapPoints = ['fit']",
    '<SheetRoot snapPoints={snapPoints} initialSnap={0}>',
    '  <SheetContent>',
    '    <text>{longText}</text>',
    '  </SheetContent>',
    '</SheetRoot>',
  ],
};

export const sheetControlledDemoMeta = {
  highlight: '{23-24,32-42,36-54}',
  description:
    'highlight controlled state, the external trigger, and SheetRoot show/onShowChange wiring',
  content: [
    'const [show, setShow] = useState(false)',
    '<TriggerButton onClick={() => setShow(s => !s)} />',
    '<SheetRoot show={show} onShowChange={setShow} />',
  ],
};

export const sheetDirectionalDemoMeta = {
  highlight: '{95-119,134-139,173-204}',
  description:
    'highlight physical sides, logical sides with RTL, and vertical top/bottom sheet sides',
  content: [
    "<SheetRoot side='left' snapPoints={['fit']} />",
    "<SheetRoot side='right' snapPoints={['72%']} />",
    "<SheetRoot side='start' enableRTL={true} />",
    "<SheetRoot side='top' snapPoints={['fit']} />",
    "<SheetRoot side='bottom' snapPoints={['fit']} />",
  ],
};

export const sheetImperativeDemoMeta = {
  highlight: '{22,28-34,63-89}',
  description:
    'highlight the SheetRootRef and imperative open, close, snapTo, expand, and collapse calls',
  content: [
    'const sheetRef = useRef<SheetRootRef>(null)',
    'sheetRef.current?.open()',
    'sheetRef.current?.snapTo(0)',
    'sheetRef.current?.expand()',
    'sheetRef.current?.collapse()',
    'sheetRef.current?.close()',
  ],
};
