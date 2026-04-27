/**
 * In-memory store of LLM call results delivered via webhook.
 *
 * The backend is asynchronous: it acknowledges POST /api/v1/llm/call with a
 * job_id and later POSTs the actual response to the configured callback_url.
 * Since browsers can't receive webhooks directly, the BFF accepts the callback
 * here and parks the result keyed by job_id. The browser then polls
 * /api/llm/call/{job_id}/result against the BFF, which serves the parked entry.
 *
 * State is per-process — fine for single-instance deploys and local dev. For
 * multi-instance deploys (e.g. Vercel) replace this with Redis/Upstash so the
 * function that received the webhook and the function serving the poll can
 * share state. The public API of this module (`publish`, `getResult`) is
 * already shaped to make that swap straightforward.
 *
 * A globalThis cache ensures the store survives Next.js dev HMR module reloads.
 */

import "server-only";

export type LLMJobOutcome = "completed" | "failed";

export interface LLMJobRecord {
  outcome: LLMJobOutcome;
  status: string;
  llm_response?: unknown;
  error_message?: string | null;
  receivedAt: number;
}

/** Time after which a parked result is evicted to bound memory growth. */
const TTL_MS = 10 * 60 * 1000;

interface Store {
  results: Map<string, LLMJobRecord>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
}

const globalRef = globalThis as unknown as { __llmJobStore?: Store };
const store: Store =
  globalRef.__llmJobStore ??
  (globalRef.__llmJobStore = {
    results: new Map(),
    timers: new Map(),
  });

function scheduleEviction(jobId: string) {
  const existing = store.timers.get(jobId);
  if (existing) clearTimeout(existing);
  store.timers.set(
    jobId,
    setTimeout(() => {
      store.results.delete(jobId);
      store.timers.delete(jobId);
    }, TTL_MS),
  );
}

export function publish(jobId: string, record: LLMJobRecord): void {
  store.results.set(jobId, record);
  scheduleEviction(jobId);
}

export function getResult(jobId: string): LLMJobRecord | undefined {
  return store.results.get(jobId);
}

export function clearResult(jobId: string): void {
  store.results.delete(jobId);
  const timer = store.timers.get(jobId);
  if (timer) {
    clearTimeout(timer);
    store.timers.delete(jobId);
  }
}
