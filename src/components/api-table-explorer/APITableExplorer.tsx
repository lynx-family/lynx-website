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
  css: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  element:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
  nested:
    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
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
      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden border-0 shadow-lg dark:shadow-none dark:border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-primary/10">
                <SparklesIcon className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-xl">{texts.title}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {texts.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative flex flex-col gap-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10 font-mono text-sm h-11 bg-background/50"
                type="text"
                placeholder={texts.placeholder}
                value={query}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {texts.quickAccess}
              </span>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <Tooltip key={example.query}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 px-3 text-xs font-medium transition-all duration-200 border ${categoryStyles[example.category]} ${query === example.query ? 'ring-2 ring-primary/50 ring-offset-1' : ''}`}
                        onClick={() => handleExampleClick(example)}
                      >
                        <span className="opacity-60 mr-1.5 text-[10px] font-semibold uppercase">
                          {catLabels[example.category]}
                        </span>
                        <code className="font-mono">{example.label}</code>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p>{getTooltipText(example.category)}</p>
                      <code className="text-[10px] opacity-70 block mt-1">
                        {example.query}
                      </code>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CodeIcon className="w-4 h-4" />
              <span>{texts.embedCode}</span>
            </div>
            <div className="relative">
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
