import { notesApi } from './storage';

const WEB_BUNDLE_URL = './main.web.bundle';

function exposeNotesApi(): void {
  const api = notesApi;
  const root = globalThis as typeof globalThis & {
    __CROSS_PLATFORM_NOTES__?: typeof notesApi;
  };

  root.__CROSS_PLATFORM_NOTES__ = api;

  if (typeof window !== 'undefined') {
    window.__CROSS_PLATFORM_NOTES__ = api;
  }
}

function mountLynxView(): void {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app container for cross-platform-notes web host');
  }

  const lynxView = document.createElement('lynx-view');
  lynxView.setAttribute('url', WEB_BUNDLE_URL);
  lynxView.setAttribute('thread-strategy', 'all-on-ui');
  lynxView.style.display = 'block';
  lynxView.style.width = '100%';
  lynxView.style.height = '100%';
  lynxView.style.minHeight = '100%';

  container.replaceChildren(lynxView);
}

function bootstrapWebHost(): void {
  if (typeof document !== 'undefined') {
    document.title = 'Cross-Platform Notes';
  }

  exposeNotesApi();
  mountLynxView();

  console.log('[cross-platform-notes] web host ready', {
    platform: notesApi.platform(),
    notes: notesApi.list().length,
  });
}

bootstrapWebHost();
