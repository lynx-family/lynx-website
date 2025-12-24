import { useLang } from '@rspress/core/runtime';
import { CodeBlockRuntime } from '@theme';
import React, { useState } from 'react';
import APITable from '../api-table/APITable';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

// Inline SVG icons to avoid lucide-react bundling issues
const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const CodeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

interface Example {
  query: string;
  label: string;
  category: 'css' | 'element' | 'nested';
}

const examples: Example[] = [
  { query: 'css/properties/gap', label: 'gap', category: 'css' },
  { query: 'elements/view', label: 'view', category: 'element' },
  { query: 'css/properties/align-self', label: 'align-self', category: 'css' },
  {
    query: 'css/properties/align-self.supported_in_flex_layout',
    label: 'align-self → flex layout',
    category: 'nested',
  },
];

const categoryStyles = {
  css: 'sh-bg-blue-500/10 sh-text-blue-600 dark:sh-text-blue-400 sh-border-blue-500/20 hover:sh-bg-blue-500/20',
  element:
    'sh-bg-emerald-500/10 sh-text-emerald-600 dark:sh-text-emerald-400 sh-border-emerald-500/20 hover:sh-bg-emerald-500/20',
  nested:
    'sh-bg-purple-500/10 sh-text-purple-600 dark:sh-text-purple-400 sh-border-purple-500/20 hover:sh-bg-purple-500/20',
};

const categoryLabels = {
  en: {
    css: 'CSS',
    element: 'Element',
    nested: 'Nested',
  },
  zh: {
    css: 'CSS',
    element: '元件',
    nested: '嵌套',
  },
};

const i18nTexts = {
  en: {
    title: 'API Compatibility Explorer',
    description:
      'Search for any Lynx API to view its compatibility across platforms',
    placeholder: 'Enter API path (e.g., css/properties/gap)',
    quickAccess: 'Quick access:',
    embedCode: 'Embed this table in your MDX:',
    tooltipCss: 'CSS property',
    tooltipElement: 'Built-in element',
    tooltipNested: 'Nested API using dot notation',
  },
  zh: {
    title: 'API 兼容性探索器',
    description: '搜索任意 Lynx API 以查看其跨平台兼容性',
    placeholder: '输入 API 路径（例如 css/properties/gap）',
    quickAccess: '快速访问：',
    embedCode: '将此表格嵌入到您的 MDX 中：',
    tooltipCss: 'CSS 属性',
    tooltipElement: '内置元件',
    tooltipNested: '使用点号访问的嵌套 API',
  },
};

const APITableExplorer: React.FC = () => {
  const lang = useLang();
  const texts = lang === 'zh' ? i18nTexts.zh : i18nTexts.en;
  const catLabels = lang === 'zh' ? categoryLabels.zh : categoryLabels.en;
  const [query, setQuery] = useState(examples[0].query);

  const embedCode = `import { APITable } from '@lynx';

<APITable query="${query}" />`;

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleExampleClick = (example: Example) => {
    setQuery(example.query);
  };

  const getTooltipText = (category: Example['category']) => {
    switch (category) {
      case 'css':
        return texts.tooltipCss;
      case 'element':
        return texts.tooltipElement;
      case 'nested':
        return texts.tooltipNested;
    }
  };

  return (
    <TooltipProvider>
      <div className="sh-flex sh-flex-col sh-gap-5">
        <Card className="sh-overflow-hidden sh-border-0 sh-shadow-lg dark:sh-shadow-none dark:sh-border">
          <div className="sh-absolute sh-inset-0 sh-bg-gradient-to-br sh-from-primary/5 sh-via-transparent sh-to-transparent sh-pointer-events-none" />
          <CardHeader className="sh-relative sh-pb-4">
            <div className="sh-flex sh-items-center sh-gap-2 sh-mb-1">
              <div className="sh-p-1.5 sh-rounded-md sh-bg-primary/10">
                <SparklesIcon className="sh-w-4 sh-h-4 sh-text-primary" />
              </div>
              <CardTitle className="sh-text-xl">{texts.title}</CardTitle>
            </div>
            <CardDescription className="sh-text-sm">
              {texts.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="sh-relative sh-flex sh-flex-col sh-gap-4">
            <div className="sh-relative">
              <SearchIcon className="sh-absolute sh-left-3 sh-top-1/2 sh-transform sh--translate-y-1/2 sh-w-4 sh-h-4 sh-text-muted-foreground" />
              <Input
                className="sh-pl-10 sh-font-mono sh-text-sm sh-h-11 sh-bg-background/50"
                type="text"
                placeholder={texts.placeholder}
                value={query}
                onChange={handleInputChange}
              />
            </div>

            <div className="sh-flex sh-flex-col sh-gap-2">
              <span className="sh-text-xs sh-font-medium sh-text-muted-foreground sh-uppercase sh-tracking-wide">
                {texts.quickAccess}
              </span>
              <div className="sh-flex sh-flex-wrap sh-gap-2">
                {examples.map((example) => (
                  <Tooltip key={example.query}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`sh-h-8 sh-px-3 sh-text-xs sh-font-medium sh-transition-all sh-duration-200 sh-border ${categoryStyles[example.category]} ${query === example.query ? 'sh-ring-2 sh-ring-primary/50 sh-ring-offset-1' : ''}`}
                        onClick={() => handleExampleClick(example)}
                      >
                        <span className="sh-opacity-60 sh-mr-1.5 sh-text-[10px] sh-font-semibold sh-uppercase">
                          {catLabels[example.category]}
                        </span>
                        <code className="sh-font-mono">{example.label}</code>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="sh-text-xs">
                      <p>{getTooltipText(example.category)}</p>
                      <code className="sh-text-[10px] sh-opacity-70 sh-block sh-mt-1">
                        {example.query}
                      </code>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="sh-flex sh-flex-col sh-gap-4">
          <div className="sh-flex sh-flex-col sh-gap-2">
            <div className="sh-flex sh-items-center sh-gap-2 sh-text-sm sh-text-muted-foreground">
              <CodeIcon className="sh-w-4 sh-h-4" />
              <span>{texts.embedCode}</span>
            </div>
            <div className="sh-relative">
              <CodeBlockRuntime lang="jsx" code={embedCode} />
            </div>
          </div>
          <APITable query={query} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default APITableExplorer;
