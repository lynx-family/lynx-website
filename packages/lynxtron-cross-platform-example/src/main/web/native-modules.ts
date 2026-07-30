type NativeModulesCall = (
  method: string,
  payload?: Record<string, unknown>,
) => Promise<unknown>;

/**
 * Web Core loads this ESM entry inside the Lynx BTS context through
 * `lynxView.nativeModulesMap`. This is the Web equivalent of Lynxtron's
 * desktop preload bridge.
 */
export default function createWebNotesNativeModule(
  _nativeModules: Record<string, unknown>,
  callHost: NativeModulesCall,
) {
  return {
    list: () => callHost('list'),
    get: (id: string) => callHost('get', { id }),
    create: () => callHost('create'),
    save: (note: { id: string; title: string; content: string }) =>
      callHost('save', note),
    remove: (id: string) => callHost('remove', { id }),
    platform: () => callHost('platform'),
  };
}
