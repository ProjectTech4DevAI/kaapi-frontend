/**
 * In-memory store for LLM call results received via webhook.
 *
 * The backend returns a job_id for POST /api/v1/llm/call and later sends the
 * actual response to the callback_url. Since browsers can't receive webhooks,
 * the BFF stores the response here using the job_id, and the frontend polls
 * /api/llm/call/{job_id}/result to fetch it.
 *
 * This works for single-instance/local setups. For multi-instance deployments,
 * replace this with Redis/Upstash so webhook and polling requests can share state.
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
