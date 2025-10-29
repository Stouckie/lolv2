import type { SaveStore } from "./types";
import { createLocalStorageStore } from "./localStorageStore";
import { createTauriStore, type TauriApi } from "./tauriStore";

let cached: SaveStore<unknown> | null = null;

function resolveTauri(): TauriApi | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { __TAURI__?: TauriApi | null | undefined }).__TAURI__;
  return api ?? null;
}

export function getSaveStore<TState>(): SaveStore<TState> {
  if (cached) {
    return cached as SaveStore<TState>;
  }

  const tauri = resolveTauri();
  const store = tauri ? createTauriStore<TState>(tauri) : createLocalStorageStore<TState>();

  cached = store as SaveStore<unknown>;
  return store;
}
