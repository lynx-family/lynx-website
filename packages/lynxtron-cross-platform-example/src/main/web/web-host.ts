import { notesApi } from './storage';

const WEB_BUNDLE_URL = './main.web.bundle';
const WEB_NATIVE_MODULE_URL = './web-native-modules.js';

function callNotesHost(method: string, payload?: Record<string, unknown>) {
  switch (method) {
    case 'list':
      return notesApi.list();
    case 'get':
      return notesApi.get(String(payload?.id ?? ''));
    case 'create':
      return notesApi.create();
    case 'save':
      return notesApi.save({
        id: String(payload?.id ?? ''),
        title: String(payload?.title ?? ''),
        content: String(payload?.content ?? ''),
      });
    case 'remove':
      notesApi.remove(String(payload?.id ?? ''));
      return true;
    case 'platform':
      return notesApi.platform();
    default:
      throw new Error(`Unknown web notes method: ${method}`);
  }
}

function mountLynxView(): void {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app container for cross-platform-notes web host');
  }

  const lynxView = document.createElement('lynx-view') as HTMLElement & {
    nativeModulesMap: Record<string, string>;
    onNativeModulesCall: (
      method: string,
      payload: Record<string, unknown> | undefined,
      moduleName: string,
    ) => unknown;
  };
  lynxView.nativeModulesMap = {
    webNotes: new URL(WEB_NATIVE_MODULE_URL, window.location.href).href,
  };
  lynxView.onNativeModulesCall = (method, payload, moduleName) => {
    if (moduleName !== 'webNotes') {
      throw new Error(`Unknown web native module: ${moduleName}`);
    }
    return callNotesHost(method, payload);
  };
  lynxView.setAttribute('url', WEB_BUNDLE_URL);
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

  mountLynxView();

  console.log('[cross-platform-notes] web host ready');
}

bootstrapWebHost();
