import React from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';

const { Title, Text } = Typography;

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 px-8 py-10 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-slate-100 dark:bg-slate-100 dark:text-slate-900">
            <img
              src="/assets/lynxtron/logo-light.svg"
              alt="Lynxtron logo"
              className="h-6 w-auto"
            />
            <span className="uppercase tracking-[0.18em]">
              Design-driven for Lynx
            </span>
          </div>

          <Title heading={1} className="!mb-0 !text-3xl md:!text-4xl">
            构建设计与实现高度一致的 Lynx 体验
          </Title>
          <Text className="!text-base !text-slate-600 dark:!text-slate-300">
            Lynxtron
            提供一套与设计系统对齐的页面区块与组件，帮助你在文档、示例和产品页面中快速搭建精致的一致体验。
          </Text>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              theme="solid"
              type="primary"
              size="large"
              className="!px-6 !py-2"
            >
              浏览入门指南
            </Button>
            <Button
              theme="borderless"
              size="large"
              className="!text-slate-700 dark:!text-slate-200"
            >
              查看组件示例
            </Button>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative mx-auto max-w-md">
            <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-cyan-400/30 via-sky-500/40 to-indigo-500/30 blur-2xl" />
            <div className="relative rounded-[28px] border border-slate-200 bg-slate-900/95 p-4 shadow-xl dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  Live preview
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                  Lynxtron · Layout
                </span>
              </div>
              <img
                src="/assets/lynxtron/hero-illustration.svg"
                alt="Lynxtron hero"
                className="h-auto w-full rounded-2xl border border-slate-700 bg-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
