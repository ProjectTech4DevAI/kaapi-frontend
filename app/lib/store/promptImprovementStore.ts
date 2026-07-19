/**
 * Server-side in-memory store for prompt-improvement job status. The backend
 * pushes results to `/api/webhooks/prompt-improvement`; this store keeps the
 * latest snapshot per job_id so the browser can poll a Kaapi-frontend BFF
 * endpoint instead of receiving webhooks directly.
 *
 * CAVEAT: in-memory only. Multiple serverless instances won't share state and
 * a cold start drops history. For production either back this with Redis / a
 * shared store or add SSE broadcast. Guarded by module-level singleton so a
 * single Node process retains state between requests.
 */

import type {
  PromptImprovementJobPublic,
  PromptImprovementJobSnapshot,
} from "@/app/lib/types/promptImprovement";

const globalKey = Symbol.for("kaapi.promptImprovementStore");

type SnapshotListener = (snapshot: PromptImprovementJobSnapshot) => void;

interface Store {
  jobs: Map<string, PromptImprovementJobSnapshot>;
  listeners: Map<string, Set<SnapshotListener>>;
}

type WithStore = { [globalKey]?: Store };
const g = globalThis as unknown as WithStore;

if (!g[globalKey]) {
  g[globalKey] = { jobs: new Map(), listeners: new Map() };
}

const store = g[globalKey]!;

function emit(snapshot: PromptImprovementJobSnapshot): void {
  const set = store.listeners.get(snapshot.job_id);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(snapshot);
    } catch (e) {
      console.error("prompt-improvement listener error:", e);
    }
  }
}

export function subscribeJobSnapshot(
  jobId: string,
  cb: SnapshotListener,
): () => void {
  let set = store.listeners.get(jobId);
  if (!set) {
    set = new Set();
    store.listeners.set(jobId, set);
  }
  set.add(cb);
  return () => {
    const s = store.listeners.get(jobId);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) store.listeners.delete(jobId);
  };
}

const MAX_JOBS = 500;
const TTL_MS = 30 * 60 * 1000; // drop entries older than 30 min

function prune(): void {
  const now = Date.now();
  for (const [jobId, snap] of store.jobs.entries()) {
    if (now - new Date(snap.updated_at).getTime() > TTL_MS) {
      store.jobs.delete(jobId);
    }
  }
  if (store.jobs.size > MAX_JOBS) {
    const excess = store.jobs.size - MAX_JOBS;
    let dropped = 0;
    for (const jobId of store.jobs.keys()) {
      store.jobs.delete(jobId);
      dropped += 1;
      if (dropped >= excess) break;
    }
  }
}

export function saveJobSnapshot(job: PromptImprovementJobPublic): void {
  const snapshot: PromptImprovementJobSnapshot = {
    ...job,
    updated_at: new Date().toISOString(),
  };
  store.jobs.set(job.job_id, snapshot);
  prune();
  emit(snapshot);
}

export function markJobPending(jobId: string): void {
  if (store.jobs.has(jobId)) return;
  const snapshot: PromptImprovementJobSnapshot = {
    job_id: jobId,
    status: "PENDING",
    config_version: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  };
  store.jobs.set(jobId, snapshot);
  prune();
  emit(snapshot);
}

export function getJobSnapshot(
  jobId: string,
): PromptImprovementJobSnapshot | null {
  return store.jobs.get(jobId) ?? null;
}
