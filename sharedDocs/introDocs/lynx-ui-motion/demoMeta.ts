export const motionBasicDemoMeta = {
  highlight: '{20-29,41-44,58-61}',
  description:
    'highlight the element animate() call, animation options, delayed startup, and runOnMainThread() lifecycle wiring',
  content: [
    'animate(boxMTRef.current, { scale: 0.4, rotate: "45deg" }, options)',
    'repeat: Number.POSITIVE_INFINITY',
    'repeatType: "reverse"',
    'runOnMainThread(startAnimation)()',
  ],
};

export const motionSpringDemoMeta = {
  highlight: '{20-24,36-39}',
  description:
    'highlight the delayed animate() call that switches timing to spring physics',
  content: [
    'animate(boxMTRef.current, { rotate: 90 }, { type: "spring" })',
    'repeat: Number.POSITIVE_INFINITY',
    'repeatDelay: 0.2',
  ],
};

export const motionValueDemoMeta = {
  highlight: '{21-27,35-40}',
  description:
    'highlight the motionValue() subscription and animate() call that animates the MotionValue directly',
  content: [
    'valueMTRef.current ??= motionValue(0.5)',
    'valueMTRef.current.on("change", value => setStyleProperties(...))',
    'animate(valueMTRef.current, [0.8, 1.4], options)',
  ],
};

export const motionGestureDemoMeta = {
  highlight: '{48-68,98-103,109-120}',
  description:
    'highlight the derived style effects, touch progress update, and spring recovery at the slider bounds',
  content: [
    'mapValue(progressRef.current, ...)',
    'styleEffect(".slider", { y, scaleX, scaleY })',
    'progressRef.current.set(calcProgress(...))',
    'animate(progressRef.current, 0, { type: "spring" })',
  ],
};

export const motionMiniDemoMeta = {
  highlight: '{10-11,18-20,23-30,41-57}',
  description:
    'highlight numeric motion values, explicit transform writes, value-change subscriptions, and button-triggered mini animate() calls',
  content: [
    'const x = useMotionValueRef(0)',
    'transform: `translateX(${xValue}px) scale(${scaleValue})`',
    'useMotionValueRefEvent(x, "change", ...)',
    'animate(x.current, target, { type: "spring" })',
  ],
};
