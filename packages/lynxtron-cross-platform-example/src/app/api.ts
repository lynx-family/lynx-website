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
  list(): Promise<NoteSummary[]>;
  get(id: string): Promise<NoteRecord | null>;
  create(): Promise<NoteRecord>;
  save(note: {
    id: string;
    title: string;
    content: string;
  }): Promise<NoteRecord>;
  remove(id: string): Promise<void>;
  platform(): Promise<{
    platform: 'web';
    runtime: 'browser';
    storage: 'localStorage';
    version: string;
  }>;
};

type UnifiedNotesApi = {
  list(): Promise<NoteSummary[]>;
  get(id: string): Promise<NoteRecord | null>;
  create(): Promise<NoteRecord>;
  save(draft: NoteDraft): Promise<NoteRecord>;
  remove(id: string): Promise<boolean>;
  getPlatformInfo(): Promise<PlatformInfo>;
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
  try {
    // @ts-ignore - injected by Web Core from lynxView.nativeModulesMap
    return NativeModules?.webNotes ?? null;
  } catch {
    return null;
  }
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
    async list() {
      return [fallbackSummary(record)];
    },
    async get(id: string) {
      return id === record.id ? record : null;
    },
    async create() {
      record = {
        id: `local-${Date.now()}`,
        title: 'New idea',
        content: '# New idea\n\nCapture the next product thought here.',
        updatedAt: new Date().toISOString(),
      };
      return record;
    },
    async save(draft: NoteDraft) {
      record = {
        id: draft.id ?? record.id,
        title: draft.title ?? record.title,
        content: draft.content ?? record.content,
        updatedAt: new Date().toISOString(),
      };
      return record;
    },
    async remove(id: string) {
      return id === record.id;
    },
    async getPlatformInfo() {
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
      async list() {
        return desktop.notes!.list();
      },
      async get(id: string) {
        return desktop.notes!.get(id);
      },
      async create() {
        return desktop.notes!.create();
      },
      async save(draft: NoteDraft) {
        return desktop.notes!.save(draft);
      },
      async remove(id: string) {
        return desktop.notes!.remove(id);
      },
      async getPlatformInfo() {
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
      async list() {
        return web.list();
      },
      async get(id: string) {
        return web.get(id);
      },
      async create() {
        return web.create();
      },
      async save(draft: NoteDraft) {
        const current = draft.id ? await web.get(draft.id) : null;
        return web.save({
          id: draft.id ?? current?.id ?? `note-${Date.now()}`,
          title: draft.title ?? current?.title ?? 'New idea',
          content: draft.content ?? current?.content ?? '',
        });
      },
      async remove(id: string) {
        await web.remove(id);
        return true;
      },
      async getPlatformInfo() {
        const info = await web.platform();
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
