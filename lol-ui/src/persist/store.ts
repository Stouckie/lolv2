import type { SaveStore } from "./types";
import { createLocalStorageStore } from "./localStorageStore";
import { createTauriStore } from "./tauriStore";

let cached: SaveStore<unknown> | null = null;

function hasTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);
}

export function getSaveStore<TState>(): SaveStore<TState> {
  if (cached) {
    return cached as SaveStore<TState>;
  }

  const store = hasTauri()
    ? createTauriStore<TState>()
    : createLocalStorageStore<TState>();

  cached = store as SaveStore<unknown>;
  return store;
}
