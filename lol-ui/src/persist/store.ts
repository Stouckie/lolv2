import type { SaveStore } from "./types";
import { createLocalStorageStore } from "./localStorageStore";

export function getSaveStore<TState>(): SaveStore<TState> {
  // Aujourd’hui: navigateur (localStorage). Plus tard: FS/Electron, RN/AsyncStorage, etc.
  return createLocalStorageStore<TState>();
}
