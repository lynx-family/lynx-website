import { contextBridge } from '@lynx-js/lynxtron/context-bridge';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

type NoteRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type NoteSummary = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

type NoteDraft = {
  id?: string;
  title?: string;
  content?: string;
};

type PlatformInfo = {
  kind: 'desktop';
  os: string;
  arch: string;
  storage: 'filesystem';
  storageDir: string;
};

const STORAGE_DIR = path.join(os.homedir(), '.lynxtron-cross-platform-notes');
const INITIALIZED_MARKER = path.join(STORAGE_DIR, '.initialized');
const NOTE_SUFFIX = '.json';

const DEFAULT_NOTES: Array<Pick<NoteRecord, 'id' | 'title' | 'content'>> = [
  {
    id: 'release-plan',
    title: 'Desktop release plan',
    content:
      '# Desktop release plan\n\nShip the Lynx UI, verify native capabilities, and share one bundle across hosts.',
  },
  {
    id: 'design-review',
    title: 'Design review',
    content:
      '# Design review\n\nPolish navigation, canvas tools, and the platform status bar.',
  },
  {
    id: 'platform-checklist',
    title: 'Platform checklist',
    content:
      '# Platform checklist\n\n- Desktop: filesystem\n- Web: localStorage\n- UI: shared Lynx bundle',
  },
];

function ensureStorageDir(): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function notePath(id: string): string {
  return path.join(STORAGE_DIR, `${sanitizeId(id)}${NOTE_SUFFIX}`);
}

function sanitizeId(id: string): string {
  return (
    id
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || `note-${Date.now()}`
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function compareLexicographicallyDesc(left: string, right: string): number {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

function compareLexicographicallyAsc(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function generateId(): string {
  return `note-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function readNoteFile(filePath: string): NoteRecord | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<NoteRecord>;
    if (!parsed.id || !parsed.title || typeof parsed.content !== 'string')
      return null;
    return {
      id: String(parsed.id),
      title: String(parsed.title),
      content: String(parsed.content),
      createdAt: String(parsed.createdAt ?? parsed.updatedAt ?? nowIso()),
      updatedAt: String(parsed.updatedAt ?? parsed.createdAt ?? nowIso()),
    };
  } catch {
    return null;
  }
}

function writeNote(note: NoteRecord): NoteRecord {
  ensureStorageDir();
  fs.writeFileSync(
    notePath(note.id),
    `${JSON.stringify(note, null, 2)}\n`,
    'utf-8',
  );
  return note;
}

function listNoteFiles(): string[] {
  ensureStorageDir();
  return fs
    .readdirSync(STORAGE_DIR)
    .filter((name) => name.endsWith(NOTE_SUFFIX))
    .map((name) => path.join(STORAGE_DIR, name));
}

function seedDefaultNotesIfNeeded(): void {
  ensureStorageDir();
  if (fs.existsSync(INITIALIZED_MARKER)) return;
  if (listNoteFiles().length > 0) {
    fs.writeFileSync(INITIALIZED_MARKER, nowIso(), 'utf-8');
    return;
  }

  const timestamp = nowIso();
  for (const draft of DEFAULT_NOTES) {
    writeNote({
      id: draft.id,
      title: draft.title,
      content: draft.content,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  fs.writeFileSync(INITIALIZED_MARKER, timestamp, 'utf-8');
}

function loadAllNotes(): NoteRecord[] {
  seedDefaultNotesIfNeeded();
  return listNoteFiles()
    .map((filePath) => readNoteFile(filePath))
    .filter((note): note is NoteRecord => note !== null)
    .sort(
      (a, b) =>
        compareLexicographicallyDesc(a.updatedAt, b.updatedAt) ||
        compareLexicographicallyAsc(a.title, b.title),
    );
}

function toSummary(note: NoteRecord): NoteSummary {
  const excerpt = note.content.replace(/\s+/g, ' ').trim().slice(0, 120);

  return {
    id: note.id,
    title: note.title,
    excerpt: excerpt || 'No content yet',
    updatedAt: note.updatedAt,
  };
}

function getNoteById(id: string): NoteRecord | null {
  const note = readNoteFile(notePath(id));
  return note;
}

function upsertNote(draft: NoteDraft): NoteRecord {
  const timestamp = nowIso();
  const existing = draft.id ? getNoteById(draft.id) : null;
  const note: NoteRecord = {
    id: sanitizeId(draft.id ?? generateId()),
    title: (draft.title ?? existing?.title ?? 'New idea').trim() || 'New idea',
    content:
      draft.content ??
      existing?.content ??
      '# New idea\n\nCapture the next product thought here.',
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  return writeNote(note);
}

function removeNoteById(id: string): boolean {
  try {
    fs.unlinkSync(notePath(id));
    return true;
  } catch {
    return false;
  }
}

function bootstrapDesktopPreload(): void {
  contextBridge.exposeInLynxBTS({
    notes: {
      list(): NoteSummary[] {
        return loadAllNotes().map(toSummary);
      },

      get(id: string): NoteRecord | null {
        return getNoteById(id);
      },

      create(draft: NoteDraft = {}): NoteRecord {
        return upsertNote(draft);
      },

      save(draft: NoteDraft): NoteRecord {
        return upsertNote(draft);
      },

      remove(id: string): boolean {
        return removeNoteById(id);
      },
    },
    platform: {
      getInfo(): PlatformInfo {
        ensureStorageDir();
        return {
          kind: 'desktop',
          os: os.platform(),
          arch: os.arch(),
          storage: 'filesystem',
          storageDir: STORAGE_DIR,
        };
      },
    },
  });

  console.log('[cross-platform-notes] desktop preload ready', {
    storageDir: STORAGE_DIR,
  });
}

bootstrapDesktopPreload();
