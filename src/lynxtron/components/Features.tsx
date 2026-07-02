import React from 'react';
import { Card, Typography } from '@douyinfe/semi-ui';
import { Sparkles, LayoutTemplate, ScrollText, Palette } from 'lucide-react';

const { Title, Text } = Typography;

const FEATURES = [
  {
    icon: Sparkles,
    title: '设计驱动的布局片段',
    description:
      '提供 Hero、Features、Footer 等常用页面区块，帮助你快速拼装与设计稿一致的页面结构。',
  },
  {
    icon: LayoutTemplate,
    title: '对齐 Lynx 文档体系',
    description:
      '与现有 Lynx / ReactLynx 文档结构兼容，可直接在 MDX 页面中嵌入。',
  },
  {
    icon: ScrollText,
    title: '适配文档与示例场景',
    description:
      '在文档页、指南页和示例说明页中复用相同的视觉模式，提升整体体验一致性。',
  },
  {
    icon: Palette,
    title: 'Tailwind + Semi UI 组合',
    description:
      '利用 Tailwind 工具类与 Semi UI 组件能力，构建既灵活又统一的设计语义组件。',
  },
];

export const Features: React.FC = () => {
  return (
    <section className="mt-10 space-y-6">
      <div className="space-y-2">
        <Title heading={3} className="!mb-0">
          Lynxtron 能帮你做什么？
        </Title>
        <Text className="!text-sm !text-slate-600 dark:!text-slate-300">
          从 Hero 到 Footer，Lynxtron
          覆盖一整套设计良好的页面区块，适合直接嵌入你的文档与示例中。
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="!border-slate-200 !bg-white !shadow-none dark:!border-slate-700 dark:!bg-slate-900"
              bodyStyle={{ padding: 16 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <Text strong className="!text-sm">
                    {feature.title}
                  </Text>
                  <Text className="!text-xs !leading-relaxed !text-slate-600 dark:!text-slate-300">
                    {feature.description}
                  </Text>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default Features;
