import { useCallback, useEffect, useState } from '@lynx-js/react';
import '@lynxtron-showcases/config/tokens.css';
import './App.css';
import { getNotesApi, type NoteSummary, type PlatformInfo } from './api';

function formatTimestamp(value: string): string {
  if (!value) return 'Just now';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toISOString().slice(0, 16).replace('T', ' ');
}

export function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [status, setStatus] = useState('Loading notes...');

  const inputValueProp = useCallback((value: string) => ({ value }) as any, []);

  const readInputValue = useCallback(
    (e: any) => e?.detail?.value ?? e?.value ?? '',
    [],
  );

  const refreshNotes = useCallback(async (preferredId?: string) => {
    const api = getNotesApi();
    const nextNotes = await api.list();
    setNotes(nextNotes);

    const nextActiveId =
      preferredId && nextNotes.some((note) => note.id === preferredId)
        ? preferredId
        : (nextNotes[0]?.id ?? '');

    setActiveId(nextActiveId);
    return { api, nextNotes, nextActiveId };
  }, []);

  const loadActiveNote = useCallback(async (noteId: string) => {
    if (!noteId) {
      setTitle('');
      setContent('');
      setSavedTitle('');
      setSavedContent('');
      return;
    }

    const note = await getNotesApi().get(noteId);
    if (!note) return;

    setTitle(note.title);
    setContent(note.content);
    setSavedTitle(note.title);
    setSavedContent(note.content);
  }, []);

  const flushDirtyNote = useCallback(async () => {
    if (!activeId || (title === savedTitle && content === savedContent))
      return null;

    const saved = await getNotesApi().save({
      id: activeId,
      title,
      content,
    });
    setNotes(await getNotesApi().list());
    setSavedTitle(saved.title);
    setSavedContent(saved.content);
    return saved;
  }, [activeId, content, savedContent, savedTitle, title]);

  const handleCreate = useCallback(async () => {
    const flushed = await flushDirtyNote();
    const created = await getNotesApi().create();
    const snapshot = await refreshNotes(created.id);
    setTitle(created.title);
    setContent(created.content);
    setSavedTitle(created.title);
    setSavedContent(created.content);
    setStatus(
      `${flushed ? `Saved ${flushed.title} · ` : ''}Created ${snapshot.nextNotes.length} note${snapshot.nextNotes.length === 1 ? '' : 's'}`,
    );
  }, [flushDirtyNote, refreshNotes]);

  const saveActiveNote = useCallback(
    (
      nextTitle: string,
      nextContent: string,
      nextStatus: 'manual' | 'autosave',
    ) => {
      if (!activeId) return null;
      return getNotesApi()
        .save({
          id: activeId,
          title: nextTitle,
          content: nextContent,
        })
        .then(async (saved) => {
          await refreshNotes(saved.id);
          setTitle(saved.title);
          setContent(saved.content);
          setSavedTitle(saved.title);
          setSavedContent(saved.content);
          setStatus(
            `${nextStatus === 'autosave' ? 'Autosaved' : 'Saved'} ${saved.title}`,
          );
          return saved;
        });
    },
    [activeId, refreshNotes],
  );

  const handleSave = useCallback(() => {
    void saveActiveNote(title, content, 'manual');
  }, [content, saveActiveNote, title]);

  const handleRemove = useCallback(async () => {
    if (!activeId) return;
    const removed = await getNotesApi().remove(activeId);
    if (!removed) {
      setStatus('Failed to remove note');
      return;
    }

    const snapshot = await refreshNotes();
    if (snapshot.nextActiveId) {
      const next = await snapshot.api.get(snapshot.nextActiveId);
      if (next) {
        setTitle(next.title);
        setContent(next.content);
        setSavedTitle(next.title);
        setSavedContent(next.content);
      }
    } else {
      setTitle('');
      setContent('');
      setSavedTitle('');
      setSavedContent('');
    }
    setStatus('Removed note');
  }, [activeId, refreshNotes]);

  const handleSelect = useCallback(
    async (noteId: string) => {
      if (noteId !== activeId) {
        await flushDirtyNote();
      }
      setActiveId(noteId);
      await loadActiveNote(noteId);
      const selected = await getNotesApi().get(noteId);
      if (selected) setStatus(`Opened ${selected.title}`);
    },
    [activeId, flushDirtyNote, loadActiveNote],
  );

  useEffect(() => {
    void (async () => {
      try {
        const snapshot = await refreshNotes();
        setPlatformInfo(await snapshot.api.getPlatformInfo());
        if (snapshot.nextActiveId) {
          const firstNote = await snapshot.api.get(snapshot.nextActiveId);
          if (firstNote) {
            setTitle(firstNote.title);
            setContent(firstNote.content);
            setSavedTitle(firstNote.title);
            setSavedContent(firstNote.content);
          }
          setStatus(`Loaded ${snapshot.nextNotes.length} notes`);
        } else {
          setStatus('No notes yet');
        }
      } catch (error) {
        setStatus(
          `Failed to load notes: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }, [refreshNotes]);

  const isDirty = title !== savedTitle || content !== savedContent;

  useEffect(() => {
    if (!activeId || !isDirty) return;

    const timer = setTimeout(() => {
      void saveActiveNote(title, content, 'autosave');
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [activeId, content, isDirty, saveActiveNote, title]);

  const activeNote: NoteSummary | null =
    notes.find((note) => note.id === activeId) ?? null;

  return (
    <view className="notes-root">
      <view className="notes-shell">
        <view className="notes-sidebar">
          <text className="sidebar-title">Notes</text>

          <view className="sidebar-actions">
            <view
              className="notes-button notes-button-primary"
              bindtap={handleCreate}
            >
              <text className="notes-button-text-accent">New note</text>
            </view>
            <view className="notes-button" bindtap={handleSave}>
              <text className="notes-button-text">
                {isDirty ? 'Save' : 'Saved'}
              </text>
            </view>
          </view>

          <scroll-view scroll-y className="note-list">
            {notes.map((note) => (
              <view
                className={
                  note.id === activeId
                    ? 'note-item note-item-active'
                    : 'note-item'
                }
                key={note.id}
                bindtap={() => handleSelect(note.id)}
              >
                <text className="note-title" text-maxline="1">
                  {note.title}
                </text>
                <text className="note-excerpt" text-maxline="1">
                  {note.excerpt || 'No content yet'}
                </text>
                <text className="note-meta">
                  {formatTimestamp(note.updatedAt)}
                </text>
              </view>
            ))}
          </scroll-view>
        </view>

        <view className="notes-editor">
          <input
            className="title-input"
            {...inputValueProp(title)}
            placeholder="Note title"
            bindinput={(e: any) => setTitle(readInputValue(e))}
          />
          <input
            className="editor-input"
            {...inputValueProp(content)}
            placeholder="# Write markdown here"
            bindinput={(e: any) => setContent(readInputValue(e))}
          />

          <view className="editor-preview">
            <text className="preview-label">Preview</text>
            <text className="preview-title">{title || 'New idea'}</text>
            <text className="preview-content">
              {content ||
                '# New idea\n\nCapture the next product thought here.'}
            </text>
          </view>

          <view className="editor-actions">
            <view
              className="notes-button notes-button-primary"
              bindtap={handleSave}
            >
              <text className="notes-button-text-accent">
                {isDirty ? 'Save' : 'Saved'}
              </text>
            </view>
            <view className="notes-button" bindtap={handleRemove}>
              <text className="notes-button-text-error">Delete</text>
            </view>
          </view>
        </view>
      </view>

      <view className="notes-footer">
        <text className="footer-copy">
          {platformInfo
            ? `${platformInfo.kind} · ${platformInfo.runtime}`
            : 'Loading platform...'}
        </text>
        <text className="footer-copy">
          {platformInfo
            ? `${platformInfo.storage} · ${platformInfo.detail}`
            : 'Detecting host adapter'}
        </text>
        <text className="footer-status">
          {status}
          {activeNote
            ? ` · active ${formatTimestamp(activeNote.updatedAt)}`
            : ''}
        </text>
      </view>
    </view>
  );
}
