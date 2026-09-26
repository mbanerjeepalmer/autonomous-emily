"use client";

// Browser-only state for the two buyer-driven layers on top of the pipeline:
// a "selection" (items to use as a direction for refining) and a "bag"
// (items to keep). Both are id -> ISO timestamp maps in localStorage, same
// pattern as the decision store in Decision.tsx — but backed by a shared
// module-level store (not per-component state) so a toggle in one row is
// immediately visible to every other component reading the same key, e.g.
// the refine bar's "N selected" count.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type Listener = () => void;

class IdSetStore {
  private cache: Record<string, string> | null = null;
  private listeners = new Set<Listener>();

  constructor(private key: string) {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === this.key) {
          this.cache = null;
          this.emit();
        }
      });
    }
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private read(): Record<string, string> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(localStorage.getItem(this.key) ?? "{}");
    } catch {
      this.cache = {};
    }
    return this.cache!;
  }

  private write(next: Record<string, string>) {
    this.cache = next;
    try {
      localStorage.setItem(this.key, JSON.stringify(next));
    } catch {}
    this.emit();
  }

  getSnapshot = () => this.read();
  getServerSnapshot = () => EMPTY;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  has = (id: string) => id in this.read();

  toggle(id: string) {
    const next = { ...this.read() };
    if (id in next) delete next[id];
    else next[id] = new Date().toISOString();
    this.write(next);
  }

  remove(id: string) {
    const cur = this.read();
    if (!(id in cur)) return;
    const next = { ...cur };
    delete next[id];
    this.write(next);
  }

  clear() {
    this.write({});
  }
}

const EMPTY: Record<string, string> = {};
const stores = new Map<string, IdSetStore>();

function storeFor(key: string): IdSetStore {
  let s = stores.get(key);
  if (!s) {
    s = new IdSetStore(key);
    stores.set(key, s);
  }
  return s;
}

function useIdSet(key: string) {
  const store = storeFor(key);
  const ids = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  // Distinguishes "confirmed empty" from "not hydrated yet" so pages can hold off rendering
  // bag/selection-dependent UI for the one tick it takes to read localStorage after mount.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const has = useCallback((id: string) => store.has(id), [store]);
  const remove = useCallback((id: string) => store.remove(id), [store]);
  const toggle = useCallback((id: string) => store.toggle(id), [store]);
  const clear = useCallback(() => store.clear(), [store]);

  return { ids, ready, has, remove, toggle, clear };
}

/** Items the buyer has picked as "more like this" — the compass for refining. */
export function useSelection() {
  return useIdSet("emily:selection");
}

/** Items the buyer wants to keep, independent of any search or refinement. */
export function useBag() {
  return useIdSet("emily:bag");
}
