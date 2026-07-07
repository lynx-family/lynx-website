export const swiperCustomTinderDemoMeta = {
  highlight: '{22-35,81-83}',
  description:
    'highlight the custom animation function and how it is wired into custom mode',
  content: [
    'const customAnimation = (value: number) => { ... }',
    "mode='custom'",
    'main-thread:customAnimation={customAnimation}',
    'customAnimationFirstScreen={customAnimationFirstScreen}',
  ],
};

export const swiperBasicDemoMeta = {
  highlight: '{33-46,63-66}',
  description:
    'highlight the normal mode sizing and how onChange drives the indicator',
  content: [
    '<Swiper',
    '  itemWidth={itemWidths[itemWidthsIndex] ?? 0}',
    '  containerWidth={...}',
    '  onChange={setCurrentIndex}',
    "  mode='normal'",
    '  modeConfig={{ align: alignArr[alignIndex], spaceBetween: 16 }}',
    '/>',
    '<Indicator current={currentIndex} count={itemArr.length} />',
  ],
};

export const swiperLoopDemoMeta = {
  highlight: '{34-48}',
  description:
    'highlight the loop, autoplay, spacing, and current index settings',
  content: [
    '<Swiper',
    '  itemWidth={itemWidth + SwiperItemGap}',
    '  containerWidth={containWidth}',
    '  loop={true}',
    '  modeConfig={{ spaceBetween: SwiperItemGap }}',
    '  autoPlay={true}',
    '  onChange={setCurrentIndex}',
    '/>',
  ],
};

export const swiperBouncesDemoMeta = {
  highlight: '{43-64}',
  description:
    'highlight the edge spacing, hidden overflow, and bounceConfig loading affordance',
  content: [
    "modeConfig={{ align: 'start', spaceBetween: ITEM_GAP }}",
    "style={{ overflow: 'hidden' }}",
    'bounceConfig={{',
    '  enable: true,',
    '  endBounceItemWidth: BOUNCE_WIDTH,',
    "  endBounceItem: <view className='bounce-loading'>...</view>",
    '}}',
  ],
};

export const swiperLazyDemoMeta = {
  highlight: '{56-67}',
  description: 'highlight LazyComponent wrapping the slide content',
  content: [
    '<LazyComponent',
    "  scene='scene'",
    '  pid={...}',
    "  estimatedStyle={{ width: '100%', height: '100%' }}",
    '>',
    '  <Card index={realIndex} />',
    '</LazyComponent>',
  ],
};

export const swiperCustomDemoMeta = {
  highlight: '{22-44,54-70}',
  description:
    'highlight the customAnimation functions and the Swiper animation props',
  content: [
    'function customAnimation(value: number, _index: number) {',
    '  const scale = interpolate(value, [-1, 0, 1], [0.86, 1, 0.86])',
    '  const translateY = interpolate(value, [-1, 0, 1], [12, 0, 12])',
    '  const opacity = interpolate(value, [-1, 0, 1], [0.64, 1, 0.64])',
    '}',
    "modeConfig={{ align: 'center', spaceBetween: 16 }}",
    'main-thread:customAnimation={customAnimation}',
    'customAnimationFirstScreen={customAnimationFirstScreen}',
  ],
};

export const swiperCustomScaleDemoMeta = {
  highlight: '{25-60,71-81}',
  description:
    'highlight custom mode placement, scaling, and Swiper mode wiring',
  content: [
    'const centerOffset = (...)',
    "const translateX = interpolate(value, [-1, 0, 1], [...], 'extend')",
    'const scale = interpolate(value, [-1, 0, 1], [0.84, 1, 0.84])',
    'const opacity = interpolate(value, [-1, 0, 1], [0.72, 1, 0.72])',
    'return {',
    '  transform: translateX(...) scale(...)',
    '}',
    "mode='custom'",
    'main-thread:customAnimation={customAnimation}',
  ],
};
