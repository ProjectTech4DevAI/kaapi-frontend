/**
 * Caches a submission's rows so opening a run's results is snappy.
 *
 * A submission file never changes — re-uploading mints a new id — so entries
 * need no TTL and no invalidation. Memory serves the same tab; IndexedDB
 * survives a reload. Deliberately not localStorage: a thousand rows of source
 * text would evict the spreadsheet snapshots that already compete for the ~5MB
 * origin budget.
 *
 * Every path degrades to a miss, so a blocked or absent store only costs a refetch.
 */
import type { SubmissionInputs } from "@/app/lib/assessment/inputJoin";

const DB_NAME = "kaapi_assessment";
const DB_VERSION = 1;
const STORE_NAME = "submission_inputs";

const memory = new Map<string, SubmissionInputs>();

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function readCachedInputs(
  submissionId: string,
): Promise<SubmissionInputs | null> {
  const cached = memory.get(submissionId);
  if (cached) return cached;

  const db = await openDatabase();
  if (!db) return null;

  const stored = await new Promise<SubmissionInputs | null>((resolve) => {
    try {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(submissionId);
      request.onsuccess = () =>
        resolve((request.result as SubmissionInputs) ?? null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();

  if (stored) memory.set(submissionId, stored);
  return stored;
}

export async function writeCachedInputs(
  submissionId: string,
  inputs: SubmissionInputs,
): Promise<void> {
  memory.set(submissionId, inputs);

  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(inputs, submissionId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
