import { useId, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  FileText,
  Lightbulb,
  MessageSquare,
  Terminal,
} from 'lucide-react';
import styles from './index.module.less';

export type AgentConversationStep =
  | { type: 'note'; content: ReactNode }
  | {
      type: 'tool';
      id: string;
      name?: string;
      kind?: 'command' | 'read';
      description: string;
      command: string;
      output: string;
      wrapOutput?: boolean;
      result?: string;
      defaultOpen?: boolean;
    };

export interface AgentConversationProps {
  prompt: string;
  steps: AgentConversationStep[];
  children: ReactNode;
  locale?: 'en' | 'zh';
  caption?: string;
}

const labels = {
  en: {
    title: 'Example conversation',
    user: 'You',
    agent: 'Agent',
    expand: 'Expand all',
    collapse: 'Collapse all',
    input: 'Call',
    output: 'Output',
    calls: 'tool calls',
    thought: 'Approach',
  },
  zh: {
    title: '示例对话',
    user: '你',
    agent: 'Agent',
    expand: '展开全部',
    collapse: '收起全部',
    input: '调用',
    output: '输出',
    calls: '次工具调用',
    thought: '思路',
  },
};

/** A scripted conversation. Tool calls disclose their explanation, input, and output. */
export function AgentConversation({
  prompt,
  steps,
  children,
  locale = 'en',
  caption,
}: AgentConversationProps) {
  const copy = labels[locale];
  const prefix = useId();
  const tools = steps.filter((step) => step.type === 'tool');
  const [expanded, setExpanded] = useState(
    () =>
      new Set(tools.filter((tool) => tool.defaultOpen).map((tool) => tool.id)),
  );
  const allExpanded =
    tools.length > 0 && tools.every((tool) => expanded.has(tool.id));

  const markdown = (import.meta as ImportMeta & { env: { SSG_MD?: boolean } })
    .env.SSG_MD;
  if (markdown) {
    return (
      <section>
        <p>
          <strong>{copy.title}</strong>
        </p>
        <p>
          <strong>{copy.user}:</strong> {prompt}
        </p>
        <p>
          <strong>{copy.agent}</strong>
        </p>
        {steps.map((step, index) =>
          step.type === 'note' ? (
            <p key={index}>{step.content}</p>
          ) : (
            <section key={step.id}>
              <p>
                <strong>{step.name ?? step.command}</strong>
                {step.result && ` · ${step.result}`}
              </p>
              <pre>
                <code>
                  {step.kind === 'read' ? '// ' : '# '}
                  {step.description}
                  {'\n'}
                  {step.command}
                </code>
              </pre>
              <p>{copy.output}</p>
              <pre>
                <code>{step.output}</code>
              </pre>
            </section>
          ),
        )}
        {children}
        {caption && <p>{caption}</p>}
      </section>
    );
  }

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className={styles.conversation} aria-label={copy.title}>
      <header className={styles.toolbar}>
        <span className={styles.title}>
          <MessageSquare size={15} aria-hidden="true" />
          {copy.title}
          <span className={styles.count}>
            {tools.length} {copy.calls}
          </span>
        </span>
        {tools.length > 0 && (
          <button
            type="button"
            className={styles.toggleAll}
            onClick={() =>
              setExpanded(
                allExpanded ? new Set() : new Set(tools.map((tool) => tool.id)),
              )
            }
          >
            {allExpanded ? copy.collapse : copy.expand}
          </button>
        )}
      </header>

      <div className={styles.body}>
        <div className={styles.user}>
          <span className={styles.role}>{copy.user}</span>
          <p>{prompt}</p>
        </div>

        <div className={styles.agentLabel}>
          <span className={styles.agentMark} aria-hidden="true">
            <Terminal size={14} />
          </span>
          <span>{copy.agent}</span>
        </div>

        <div className={styles.steps}>
          {steps.map((step, index) => {
            if (step.type === 'note') {
              return (
                <div className={styles.note} key={index}>
                  <Lightbulb size={14} aria-hidden="true" />
                  <p>
                    <span className={styles.srOnly}>{copy.thought}: </span>
                    {step.content}
                  </p>
                </div>
              );
            }
            const open = expanded.has(step.id);
            const contentId = `${prefix}-${step.id}`;
            const Icon = step.kind === 'read' ? FileText : Terminal;
            return (
              <details
                key={step.id}
                open={open}
                className={`${styles.tool} ${step.defaultOpen ? styles.featured : ''}`}
                data-tool={step.id}
              >
                <summary
                  aria-controls={contentId}
                  onClick={(event) => {
                    event.preventDefault();
                    toggle(step.id);
                  }}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span className={styles.toolName}>
                    {step.name ?? step.command}
                  </span>
                  {step.result && (
                    <span className={styles.toolResult}>
                      <Check size={12} aria-hidden="true" />
                      {step.result}
                    </span>
                  )}
                  <ChevronRight
                    className={styles.chevron}
                    size={15}
                    aria-hidden="true"
                  />
                </summary>
                <div className={styles.toolBody} id={contentId}>
                  <div className={styles.codeLabel}>{copy.input}</div>
                  <pre className={styles.input}>
                    <code>
                      <span className={styles.comment}>
                        {step.kind === 'read' ? '// ' : '# '}
                        {step.description}
                      </span>
                      {'\n'}
                      {step.command}
                    </code>
                  </pre>
                  <div className={styles.codeLabel}>{copy.output}</div>
                  <pre
                    className={`${styles.output} ${step.wrapOutput === false ? styles.preformatted : ''}`}
                    tabIndex={step.wrapOutput === false ? 0 : undefined}
                  >
                    <code>{step.output}</code>
                  </pre>
                </div>
              </details>
            );
          })}
        </div>

        <div className={styles.answer}>{children}</div>
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}
    </section>
  );
}
