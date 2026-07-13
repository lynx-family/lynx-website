import { OpenUiRenderer, createOpenUiLibrary } from '@lynx-js/genui/openui';
import type { ActionEvent } from '@lynx-js/genui/openui';
import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react';

import './PlanPicker.css';

const STREAM_DELAY_MS = 360;

const OPENUI_STATEMENTS = [
  '$plan = "Pro"',
  '$billing = "Monthly"',
  'root = Stack([summary, plans, billing, actions], "column", false, "m", "stretch", "start")',
  'summary = Card([CardHeader("OpenUI Plan Picker", "Rendered from a streamed OpenUI Lang response"), TextContent("Selected: " + $plan + " · " + $billing, "large-heavy"), TextContent($billing == "Annual" ? "Annual billing includes two months free." : "Switch to annual billing to save.", "small")], "card", "column", false, "s", "start", "start")',
  'plans = Stack([freeCard, proCard, teamCard], "row", true, "s", "stretch", "start")',
  'freeCard = Card([Tag($plan == "Free" ? "Selected" : "Option"), TextContent("Free", "large-heavy"), TextContent("For experiments", "small"), Button("Choose Free", Action([@Set($plan, "Free")]), "secondary")], "sunk", "column", false, "s", "start", "start")',
  'proCard = Card([Tag($plan == "Pro" ? "Selected" : "Option"), TextContent("Pro", "large-heavy"), TextContent("For shipped apps", "small"), Button("Choose Pro", Action([@Set($plan, "Pro")]), "primary")], "sunk", "column", false, "s", "start", "start")',
  'teamCard = Card([Tag($plan == "Team" ? "Selected" : "Option"), TextContent("Team", "large-heavy"), TextContent("For collaboration", "small"), Button("Choose Team", Action([@Set($plan, "Team")]), "secondary")], "sunk", "column", false, "s", "start", "start")',
  'billing = Card([CardHeader("Billing", "@Set updates local OpenUI state"), Buttons([Button("Monthly", Action([@Set($billing, "Monthly")]), $billing == "Monthly" ? "primary" : "secondary"), Button("Annual", Action([@Set($billing, "Annual")]), $billing == "Annual" ? "primary" : "secondary")])], "clear", "column", false, "s", "stretch", "start")',
  'actions = Buttons([Button("Reset", Action([@Reset($plan), @Reset($billing)]), "secondary"), Button("Continue", Action([@ToAssistant("Continue with " + $plan + " / " + $billing)]), "primary")])',
];

const library = createOpenUiLibrary();

export function PlanPicker() {
  const [sessionId, setSessionId] = useState(0);
  const [response, setResponse] = useState('');
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    let cancelled = false;
    let statementIndex = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setResponse('');
    setDeliveredCount(0);
    setIsStreaming(true);
    setLastAction('');

    const pushNextStatement = () => {
      if (cancelled) {
        return;
      }

      statementIndex += 1;
      setResponse(OPENUI_STATEMENTS.slice(0, statementIndex).join('\n'));
      setDeliveredCount(statementIndex);

      if (statementIndex >= OPENUI_STATEMENTS.length) {
        setIsStreaming(false);
        return;
      }

      timer = setTimeout(pushNextStatement, STREAM_DELAY_MS);
    };

    timer = setTimeout(pushNextStatement, STREAM_DELAY_MS);

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [sessionId]);

  const replay = useCallback(() => {
    'background only';
    setSessionId((value) => value + 1);
  }, []);

  const handleAction = useCallback((event: ActionEvent) => {
    'background only';
    setLastAction(event.humanFriendlyMessage || String(event.type));
  }, []);

  const statusText = useMemo(() => {
    if (!isStreaming) {
      return 'stream complete';
    }
    return `streaming ${deliveredCount}/${OPENUI_STATEMENTS.length}`;
  }, [deliveredCount, isStreaming]);

  return (
    <page>
      <view className="page">
        <view className="topbar">
          <view className="status">
            <view
              className={`status-dot ${isStreaming ? 'status-dot--streaming' : 'status-dot--done'}`}
            />
            <text className="status-text">{statusText}</text>
          </view>
          <view className="replay-button" bindtap={replay}>
            <text className="replay-icon">↻</text>
            <text className="replay-label">Replay</text>
          </view>
        </view>

        {lastAction ? (
          <view className="host-action">
            <text className="host-action-label">Host Action</text>
            <text className="host-action-message">{lastAction}</text>
          </view>
        ) : null}

        <scroll-view scroll-orientation="vertical" className="scroll">
          {response ? (
            <OpenUiRenderer
              key={sessionId}
              response={response}
              library={library}
              isStreaming={isStreaming}
              onAction={handleAction}
            />
          ) : (
            <view className="empty-state">
              <text className="empty-title">Waiting for OpenUI Lang…</text>
            </view>
          )}
        </scroll-view>
      </view>
    </page>
  );
}
