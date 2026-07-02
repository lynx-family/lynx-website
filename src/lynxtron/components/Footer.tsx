import React from 'react';
import { Typography } from '@douyinfe/semi-ui';

const { Text } = Typography;

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text className="!text-xs !text-slate-500 dark:!text-slate-400">
          Lynxtron
        </Text>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="/lynxtron/Guides/introduction"
            className="text-xs text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          >
            入门指南
          </a>
          <a
            href="/lynx-ui/Guides/introduction"
            className="text-xs text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
          >
            文档
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
