type NoteInput = {
  id: string;
  title: string;
  content: string;
};

type NoteRecord = NoteInput & {
  updatedAt: string;
};

type NoteSummary = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

type PlatformInfo = {
  platform: 'web';
  runtime: 'browser';
  storage: 'localStorage';
  version: string;
};

type NotesApi = {
  list(): NoteSummary[];
  get(id: string): NoteRecord | null;
  save(note: NoteInput): NoteRecord;
  create(): NoteRecord;
  remove(id: string): void;
  platform(): PlatformInfo;
};

type NotesState = {
  notes: NoteRecord[];
};

const STORAGE_KEY = 'cross-platform-notes.v1';

const DEFAULT_NOTES: NoteRecord[] = [
  {
    id: 'release-plan',
    title: 'Desktop release plan',
    content:
      '# Desktop release plan\n\nShip the Lynx UI, verify native capabilities, and share one bundle across hosts.',
    updatedAt: '2026-06-17T09:30:00.000Z',
  },
  {
    id: 'design-review',
    title: 'Design review',
    content:
      '# Design review\n\nPolish navigation, canvas tools, and the platform status bar.',
    updatedAt: '2026-06-16T14:15:00.000Z',
  },
  {
    id: 'platform-checklist',
    title: 'Platform checklist',
    content:
      '# Platform checklist\n\n- Desktop: filesystem\n- Web: localStorage\n- UI: shared Lynx bundle',
    updatedAt: '2026-06-15T11:00:00.000Z',
  },
];

const memoryFallback: NotesState = {
  notes: DEFAULT_NOTES.slice(),
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeExcerpt(content: string): string {
  const firstLine =
    content
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  const stripped = firstLine.replace(/^#+\s*/, '');
  return stripped.length > 72 ? `${stripped.slice(0, 69)}...` : stripped;
}

function isNoteRecord(value: unknown): value is NoteRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}

function sanitizeNotes(notes: unknown): NoteRecord[] {
  if (!Array.isArray(notes)) return DEFAULT_NOTES.slice();
  const filtered = notes.filter(isNoteRecord);
  return filtered.length > 0 ? filtered : DEFAULT_NOTES.slice();
}

function readState(): NotesState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return memoryFallback;
    const parsed = JSON.parse(raw) as Partial<NotesState>;
    return { notes: sanitizeNotes(parsed.notes) };
  } catch (_) {
    return memoryFallback;
  }
}

function writeState(state: NotesState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    memoryFallback.notes = state.notes.slice();
  }
}

function persist(nextNotes: NoteRecord[]): NoteRecord[] {
  const nextState = { notes: nextNotes };
  writeState(nextState);
  return nextNotes;
}

function sortNotes(notes: NoteRecord[]): NoteRecord[] {
  return notes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function createNotesApi(): NotesApi {
  return {
    list() {
      return sortNotes(readState().notes).map((note) => ({
        id: note.id,
        title: note.title,
        excerpt: makeExcerpt(note.content),
        updatedAt: note.updatedAt,
      }));
    },

    get(id: string) {
      return readState().notes.find((note) => note.id === id) ?? null;
    },

    save(note: NoteInput) {
      const state = readState();
      const updated: NoteRecord = {
        id: note.id,
        title: note.title,
        content: note.content,
        updatedAt: nowIso(),
      };
      const nextNotes = state.notes.some((existing) => existing.id === note.id)
        ? state.notes.map((existing) =>
            existing.id === note.id ? updated : existing,
          )
        : [updated, ...state.notes];
      persist(nextNotes);
      return updated;
    },

    create() {
      const state = readState();
      const nextId = `note-${Date.now().toString(36)}`;
      const created: NoteRecord = {
        id: nextId,
        title: 'New idea',
        content: '# New idea\n\nCapture the next product thought here.',
        updatedAt: nowIso(),
      };
      persist([created, ...state.notes]);
      return created;
    },

    remove(id: string) {
      const state = readState();
      persist(state.notes.filter((note) => note.id !== id));
    },

    platform() {
      return {
        platform: 'web',
        runtime: 'browser',
        storage: 'localStorage',
        version: '0.0.1',
      };
    },
  };
}

export type { NoteInput, NoteRecord, NoteSummary, NotesApi, PlatformInfo };
export const notesApi = createNotesApi();
