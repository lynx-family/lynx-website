import React, { useState } from 'react';
import type BCD from '@lynx-js/lynx-compat-data';
import { gatherBrowsers, listFeatures, getSupportInfo } from './helpers';
import { PlatformSvg, SupportIcon, NoteIcon } from './icons';
import './styles.css';

export default function CompatTable({
  query,
  data,
  browsers: browserInfo,
  locale,
}: {
  query: string;
  data: BCD.Identifier;
  browsers: BCD.Platforms;
  locale: string;
}) {
  if (!data || !Object.keys(data).length) {
    throw new Error('CompatTable called with empty data');
  }
  const name = query.split('/').pop() as string;
  const { platformOrder, browsers } = gatherBrowsers(browserInfo);
  const features = [
    ...(data.__compat
      ? [{ name, label: name, compat: data.__compat, depth: 1 }]
      : []),
    ...listFeatures(data),
  ];

  const [expanded, setExpanded] = useState<
    Record<number, { browser: BCD.PlatformName; notes: string[] } | null>
  >({});

  function getNotes(
    compat: BCD.CompatStatement,
    platform: BCD.PlatformName,
  ): string[] {
    const s = compat.support[platform] as any;
    if (!s) return [];
    const arr = Array.isArray(s) ? s : [s];
    const notes: string[] = [];
    for (const it of arr) {
      if (it && it.notes) {
        if (Array.isArray(it.notes)) notes.push(...it.notes);
        else notes.push(String(it.notes));
      }
    }
    return notes;
  }

  function toggleNoteRow(
    rowIndex: number,
    platform: BCD.PlatformName,
    compat: BCD.CompatStatement,
  ) {
    const notes = getNotes(compat, platform);
    if (!notes.length) {
      setExpanded((prev) => ({ ...prev, [rowIndex]: null }));
      return;
    }
    setExpanded((prev) => {
      const current = prev[rowIndex];
      if (current && current.browser === platform)
        return { ...prev, [rowIndex]: null };
      return { ...prev, [rowIndex]: { browser: platform, notes } };
    });
  }

  function t(key: string) {
    const zh: Record<string, string> = {
      'legend.supported': '已支持',
      'legend.no': '不支持',
      'legend.partial': '部分支持',
      'legend.notes': '请参考开发者笔记。',
      'label.yes': '是',
      'label.no': '否',
      'label.unknown': '?',
      'category.native': '原生',
      'category.clay': 'Clay',
      'category.web': 'Web',
    };
    const en: Record<string, string> = {
      'legend.supported': 'Full support',
      'legend.no': 'No support',
      'legend.partial': 'Partial support',
      'legend.notes': 'See implementation notes.',
      'label.yes': 'Yes',
      'label.no': 'No',
      'label.unknown': '?',
      'category.native': 'native',
      'category.clay': 'clay',
      'category.web': 'web',
    };
    const dict = locale?.startsWith('zh') ? zh : en;
    return dict[key] ?? key;
  }
  function renderNote(n: string) {
    const nodes: Array<any> = [];
    const re = /<code>([\s\S]*?)<\/code>/gi;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(n)) !== null) {
      const before = n.slice(last, m.index);
      if (before) nodes.push(before);
      nodes.push(<code dangerouslySetInnerHTML={{ __html: m[1] }} />);
      last = re.lastIndex;
    }
    const after = n.slice(last);
    if (after) nodes.push(after);
    return nodes;
  }
  function Legend({ used }: { used: Set<string> }) {
    const items: Array<{ key: string; label: string }> = [];
    if (used.has('yes'))
      items.push({ key: 'yes', label: t('legend.supported') });
    if (used.has('no')) items.push({ key: 'no', label: t('legend.no') });
    if (used.has('partial'))
      items.push({ key: 'partial', label: t('legend.partial') });
    if (used.has('unknown'))
      items.push({ key: 'unknown', label: t('label.unknown') });
    return (
      <div className="compat-legend">
        <div className="compat-legend-items">
          {items.map((it) => (
            <div key={it.key} className="compat-legend-item">
              <SupportIcon level={it.key as any} />
              <span>{it.label}</span>
            </div>
          ))}
          {used.has('notes') ? (
            <div className="compat-legend-item">
              <NoteIcon />
              <span>{t('legend.notes')}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  const used = new Set<string>();

  return (
    <figure className="compat-table-container">
      <figure className="compat-table-inner">
        <table className="compat-table">
          <colgroup>
            <col className="compat-col-label" />
            {browsers.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr className="compat-platforms">
              <th></th>
              {platformOrder.map((p) => (
                <th
                  key={p}
                  colSpan={
                    process.env.COMPAT_TABLE_HIDE_CLAY && p === 'native'
                      ? browsers.filter(
                          (b) =>
                            browserInfo[b].type === 'native' ||
                            b === 'clay_macos' ||
                            b === 'clay_windows',
                        ).length
                      : browsers.filter((b) => browserInfo[b].type === p).length
                  }
                >
                  {t(`category.${p}`)}
                </th>
              ))}
            </tr>
            <tr className="compat-browsers">
              <th></th>
              {browsers.map((b) => (
                <th
                  key={b}
                  style={{ verticalAlign: 'bottom', textAlign: 'center' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignContent: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        writingMode: 'vertical-rl',
                        display: 'flex',
                        justifyItems: 'start',
                        alignItems: 'center',
                        gap: 6,
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          transform: 'rotate(180deg)',
                        }}
                      >
                        {process.env.COMPAT_TABLE_HIDE_CLAY &&
                        (b === 'clay_macos' || b === 'clay_windows')
                          ? b === 'clay_macos'
                            ? 'MacOS'
                            : 'Windows'
                          : browserInfo[b].name}
                      </span>
                      <PlatformSvg platformName={b} />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => {
              const row = expanded[i];
              return (
                <React.Fragment key={i}>
                  <tr>
                    <td
                      scope="row"
                      className={`compat-feature-depth-${Math.min(feature.depth, 3)}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="compat-row-header">
                          <span className="left-side">
                            {renderNote(feature.label)}
                          </span>
                        </div>
                      </div>
                    </td>
                    {browsers.map((b) => {
                      const { level, label } = getSupportInfo(
                        feature.compat,
                        b,
                      );
                      console.log('zhixuan', b, feature.compat, level, label);
                      const displayLabel =
                        label === 'Yes'
                          ? t('label.yes')
                          : label === 'No'
                            ? t('label.no')
                            : label === '?'
                              ? t('label.unknown')
                              : label;
                      const cellNotes = getNotes(feature.compat, b);
                      const hasNotes = cellNotes.length > 0;
                      return (
                        <td
                          key={b}
                          className={`compat-support compat-supports-${level}${hasNotes ? ' compat-has-notes' : ''}`}
                          onClick={
                            hasNotes
                              ? () => toggleNoteRow(i, b, feature.compat)
                              : undefined
                          }
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 6,
                              justifyContent: 'center',
                            }}
                          >
                            <SupportIcon level={level} />
                            <span className="compat-version-label">
                              {displayLabel}
                            </span>
                            {(() => {
                              if (level === 'yes' && hasNotes) {
                                used.add('notes');
                                return (
                                  <div className="compat-note-legend">
                                    <NoteIcon />
                                  </div>
                                );
                              } else {
                                return null;
                              }
                            })()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {row ? (
                    <tr className="compat-note-row">
                      <td colSpan={browsers.length + 1}>
                        <div className="compat-note">
                          {(() => {
                            const { level } = getSupportInfo(
                              feature.compat,
                              row.browser,
                            );
                            const levelText =
                              level === 'yes'
                                ? t('legend.supported')
                                : level === 'no'
                                  ? t('legend.no')
                                  : level === 'partial'
                                    ? t('legend.partial')
                                    : t('label.unknown');
                            const prefix = locale?.startsWith('zh')
                              ? '当前支持级别'
                              : 'Support level';
                            return (
                              <div className="compat-note-header">
                                <SupportIcon level={level} />
                                <span
                                  className={`compat-note-level compat-note-level-${level}`}
                                >
                                  {prefix}: {levelText}
                                </span>
                              </div>
                            );
                          })()}
                          {row.notes.map((n, idx) => (
                            <div key={idx} className="compat-note-item">
                              {renderNote(n)}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </figure>
      {(() => {
        for (const f of features) {
          for (const b of browsers) {
            const { level } = getSupportInfo(f.compat, b);
            used.add(level);
          }
        }
        return <Legend used={used} />;
      })()}
    </figure>
  );
}
