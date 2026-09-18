// Measured from edit-intro.30aa765da1.mp4 (6.5s, 2560px tall).
// The window stays at y=585 until 0.5s, then reaches the top at 1s.
const topKeyframes = [
  [0, 585],
  [0.5, 585],
  [0.55, 569],
  [0.6, 524],
  [0.65, 459],
  [0.7, 379],
  [0.75, 292],
  [0.8, 206],
  [0.85, 126],
  [0.9, 61],
  [0.95, 16],
  [1, 0],
] as const;

export function getVideoMaskTop(time: number): number {
  for (let i = 1; i < topKeyframes.length; i++) {
    const [endTime, endY] = topKeyframes[i];
    if (time <= endTime) {
      const [startTime, startY] = topKeyframes[i - 1];
      const progress = Math.max(0, (time - startTime) / (endTime - startTime));
      // Leave a small margin above the border for interpolation/compression.
      return Math.max(
        0,
        ((startY + (endY - startY) * progress) / 2560) * 100 - 0.25,
      );
    }
  }
  return 0;
}
