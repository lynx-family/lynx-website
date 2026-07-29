type NoteSummary = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
};

type NoteRecord = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt?: string;
};

type NoteDraft = {
  id?: string;
  title?: string;
  content?: string;
};

type PlatformInfo = {
  kind: 'desktop' | 'web';
  runtime: string;
  storage: string;
  detail: string;
};

type DesktopBridge = {
  notes?: {
    list(): NoteSummary[];
    get(id: string): NoteRecord | null;
    create(draft?: NoteDraft): NoteRecord;
    save(draft: NoteDraft): NoteRecord;
    remove(id: string): boolean;
  };
  platform?: {
    getInfo(): {
      kind: 'desktop';
      os: string;
      arch: string;
      storage: 'filesystem';
      storageDir: string;
    };
  };
};

type WebBridge = {
  list(): NoteSummary[];
  get(id: string): NoteRecord | null;
  create(): NoteRecord;
  save(note: { id: string; title: string; content: string }): NoteRecord;
  remove(id: string): void;
  platform(): {
    platform: 'web';
    runtime: 'browser';
    storage: 'localStorage';
    version: string;
  };
};

type UnifiedNotesApi = {
  list(): NoteSummary[];
  get(id: string): NoteRecord | null;
  create(): NoteRecord;
  save(draft: NoteDraft): NoteRecord;
  remove(id: string): boolean;
  getPlatformInfo(): PlatformInfo;
};

function desktopBridge(): DesktopBridge | null {
  try {
    // @ts-ignore - NativeModules is provided by Lynx desktop runtime
    return NativeModules?.nodejs?.exposed ?? null;
  } catch {
    return null;
  }
}

function webBridge(): WebBridge | null {
  const root = globalThis as typeof globalThis & {
    __CROSS_PLATFORM_NOTES__?: WebBridge;
    window?: { __CROSS_PLATFORM_NOTES__?: WebBridge };
  };

  return (
    root.__CROSS_PLATFORM_NOTES__ ??
    root.window?.__CROSS_PLATFORM_NOTES__ ??
    null
  );
}

function fallbackSummary(note: NoteRecord): NoteSummary {
  const excerpt = note.content.replace(/\s+/g, ' ').trim().slice(0, 120);
  return {
    id: note.id,
    title: note.title,
    excerpt: excerpt || 'No content yet',
    updatedAt: note.updatedAt,
  };
}

function fallbackApi(): UnifiedNotesApi {
  let record: NoteRecord = {
    id: 'local-fallback',
    title: 'Desktop release plan',
    content:
      '# Desktop release plan\n\nShip the Lynx UI, verify native capabilities, and share one bundle across hosts.',
    updatedAt: new Date().toISOString(),
  };

  return {
    list() {
      return [fallbackSummary(record)];
    },
    get(id: string) {
      return id === record.id ? record : null;
    },
    create() {
      record = {
        id: `local-${Date.now()}`,
        title: 'New idea',
        content: '# New idea\n\nCapture the next product thought here.',
        updatedAt: new Date().toISOString(),
      };
      return record;
    },
    save(draft: NoteDraft) {
      record = {
        id: draft.id ?? record.id,
        title: draft.title ?? record.title,
        content: draft.content ?? record.content,
        updatedAt: new Date().toISOString(),
      };
      return record;
    },
    remove(id: string) {
      return id === record.id;
    },
    getPlatformInfo() {
      return {
        kind: 'web',
        runtime: 'fallback',
        storage: 'memory',
        detail: 'Bridge unavailable',
      };
    },
  };
}

export function getNotesApi(): UnifiedNotesApi {
  const desktop = desktopBridge();
  if (desktop?.notes && desktop.platform) {
    return {
      list() {
        return desktop.notes!.list();
      },
      get(id: string) {
        return desktop.notes!.get(id);
      },
      create() {
        return desktop.notes!.create();
      },
      save(draft: NoteDraft) {
        return desktop.notes!.save(draft);
      },
      remove(id: string) {
        return desktop.notes!.remove(id);
      },
      getPlatformInfo() {
        const info = desktop.platform!.getInfo();
        return {
          kind: 'desktop',
          runtime: `${info.os} ${info.arch}`,
          storage: info.storage,
          detail: info.storageDir,
        };
      },
    };
  }

  const web = webBridge();
  if (web) {
    return {
      list() {
        return web.list();
      },
      get(id: string) {
        return web.get(id);
      },
      create() {
        return web.create();
      },
      save(draft: NoteDraft) {
        const current = draft.id ? web.get(draft.id) : null;
        return web.save({
          id: draft.id ?? current?.id ?? `note-${Date.now()}`,
          title: draft.title ?? current?.title ?? 'New idea',
          content: draft.content ?? current?.content ?? '',
        });
      },
      remove(id: string) {
        web.remove(id);
        return true;
      },
      getPlatformInfo() {
        const info = web.platform();
        return {
          kind: 'web',
          runtime: `${info.runtime} ${info.version}`,
          storage: info.storage,
          detail: 'localStorage',
        };
      },
    };
  }

  return fallbackApi();
}

export type { NoteSummary, NoteRecord, PlatformInfo, UnifiedNotesApi };
