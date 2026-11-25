"use client";

import { memoryBlobStore, type BlobStore } from "./localRepository";

const DB_NAME = "r1vle-files";
const STORE = "attachments";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open file storage."));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error ?? new Error("File storage request failed."));
    tx.oncomplete = () => db.close();
  }));
}

/** Attachment storage in the visitor's browser (demo mode). Falls back to memory where IndexedDB is unavailable. */
export function idbBlobStore(): BlobStore {
  if (typeof indexedDB === "undefined") return memoryBlobStore();
  return {
    put: async (key, blob) => { await run<IDBValidKey>("readwrite", (s) => s.put(blob, key)); },
    get: async (key) => (await run<Blob | undefined>("readonly", (s) => s.get(key))) ?? null,
  };
}
