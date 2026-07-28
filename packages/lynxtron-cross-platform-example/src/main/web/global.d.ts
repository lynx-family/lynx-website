import type { NotesApi } from './storage';

declare global {
  interface Window {
    __CROSS_PLATFORM_NOTES__?: NotesApi;
  }
}

export {};
