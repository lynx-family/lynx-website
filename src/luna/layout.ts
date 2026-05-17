import { resolveStudioLayout } from '@dugyu/luna-studio';
import type {
  StudioLayout,
  StudioModeGrid,
  StudioResolvedLayout,
  StudioStage,
} from '@dugyu/luna-studio';

const lunaStudioDemoModeGrid: StudioModeGrid = {
  compare: { cols: 4, rows: 1 },
  focus: { cols: 3, rows: 1 },
  lineup: { cols: 5, rows: 2 },
};

const stagePool: Record<string, StudioStage> = {
  Bloom: { id: 'Bloom', entry: 'ActBloom', theme: 'lunaris-light' },
  Checkbox: {
    id: 'Checkbox',
    entry: 'ActCheckbox',
    theme: 'lunaris-dark',
    focusKey: 'checkbox',
  },
  Dialog: {
    id: 'Dialog',
    entry: 'ActDialog',
    theme: 'luna-dark',
    focusKey: 'dialog',
  },
  FeedList: {
    id: 'FeedList',
    entry: 'OffstageActFeedList',
    theme: 'luna-dark',
    focusKey: 'feed-list',
  },
  MoonRise: {
    id: 'MoonRise',
    entry: 'ActMoonrise',
    theme: 'luna-light',
    focusKey: 'button',
  },
  MoonRiseDark: {
    id: 'MoonRiseDark',
    entry: 'ActMoonrise',
    theme: 'luna-dark',
  },
  Popover: {
    id: 'Popover',
    entry: 'ActPopover',
    theme: 'luna-light',
    focusKey: 'popover',
  },
  Radio: {
    id: 'Radio',
    entry: 'ActRadioGroup',
    theme: 'lunaris-dark',
    focusKey: 'radio-group',
  },
  ScrollView: {
    id: 'ScrollView',
    entry: 'OffstageActScrollView',
    theme: 'luna-dark',
    focusKey: 'scroll-view',
  },
  Sheet: {
    id: 'Sheet',
    entry: 'ActOne',
    theme: 'lunaris-dark',
    focusKey: 'sheet',
  },
  Swiper: {
    id: 'Swiper',
    entry: 'OffstageActSwiper',
    theme: 'luna-dark',
    focusKey: 'swiper',
  },
  Switch: {
    id: 'Switch',
    entry: 'ActSwitch',
    theme: 'lunaris-dark',
    focusKey: 'switch',
  },
};

const layoutSpec: StudioLayout = {
  compare: [
    { id: 'MoonRiseDark', style: { gridColumn: '4 / 5', gridRow: '1 / 2' } },
    { id: 'Sheet', style: { gridColumn: '2 / 3', gridRow: '1 / 2' } },
    { id: 'MoonRise', style: { gridColumn: '3 / 4', gridRow: '1 / 2' } },
    { id: 'Bloom', style: { gridColumn: '1 / 2', gridRow: '1 / 2' } },
  ],
  focus: [
    { id: 'Radio', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Switch', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'ScrollView', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Checkbox', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'FeedList', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Sheet', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Swiper', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Dialog', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    { id: 'Popover', style: { gridColumn: '2 / 4', gridRow: '1 / 2' } },
    {
      id: 'MoonRise',
      style: {
        gridColumn: '2 / 4',
        gridRow: '1 / 2',
      },
    },
    { id: 'Bloom', style: { gridColumn: '1 / 2', gridRow: '1 / 2' } },
  ],
  lineup: [
    { id: 'Radio', style: { gridColumn: '5 / 6', gridRow: '1 / 2' } },
    { id: 'Switch', style: { gridColumn: '1 / 2', gridRow: '1 / 2' } },
    { id: 'ScrollView', style: { gridColumn: '5 / 6', gridRow: '2 / 3' } },
    { id: 'Checkbox', style: { gridColumn: '2 / 3', gridRow: '1 / 2' } },
    { id: 'FeedList', style: { gridColumn: '3 / 4', gridRow: '1 / 2' } },
    { id: 'Sheet', style: { gridColumn: '4 / 5', gridRow: '1 / 2' } },
    { id: 'Swiper', style: { gridColumn: '1 / 2', gridRow: '2 / 3' } },
    { id: 'Dialog', style: { gridColumn: '4 / 5', gridRow: '2 / 3' } },
    { id: 'Popover', style: { gridColumn: '3 / 4', gridRow: '2 / 3' } },
    { id: 'MoonRise', style: { gridColumn: '2 / 3', gridRow: '2 / 3' } },
  ],
};

const layoutSpecShowcase: StudioLayout = {
  ...layoutSpec,
  focus: layoutSpec.focus.map((item) => {
    if (item.id !== 'MoonRise') return item;
    return {
      ...item,
      style: {
        ...item.style,
        backdropFilter: 'blur(2px)',
      },
    };
  }),
};

const lunaStudioDemoLayout: StudioResolvedLayout = resolveStudioLayout({
  stagePool,
  layoutSpec,
});
const lunaStudioShowcaseLayout: StudioResolvedLayout = resolveStudioLayout({
  stagePool,
  layoutSpec: layoutSpecShowcase,
});

export {
  lunaStudioDemoLayout,
  lunaStudioDemoModeGrid,
  lunaStudioShowcaseLayout,
};
