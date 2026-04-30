/**
 * Flow: POST /api/llm/call kicks off an async job and returns a job_id. The
 * browser then polls GET /api/llm/call/{job_id} (a thin BFF proxy over the
 * upstream's status endpoint) until `status === completed` or terminal
 * failure. No webhooks involved — the upstream's status endpoint returns the
 * full LLM response once the job is done.
 */

import { apiFetch } from "@/app/lib/apiClient";
import {
  CompletionParams,
  ConfigBlob,
  SavedConfig,
  Tool,
} from "@/app/lib/types/configs";
import {
  LLMCallCreateResponse,
  LLMCallRequest,
  LLMCallStatusData,
  LLMCallStatusResponse,
  LLMResponseBody,
  PollOptions,
} from "@/app/lib/types/chat";

const SUCCESS_STATUSES = new Set([
  "completed",
  "complete",
  "succeeded",
  "success",
  "done",
]);
const FAILURE_STATUSES = new Set(["failed", "error", "cancelled", "canceled"]);

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120_000;

export async function createLLMCall(
  body: LLMCallRequest,
  apiKey: string,
): Promise<LLMCallCreateResponse> {
  return apiFetch<LLMCallCreateResponse>("/api/llm/call", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Fetches the latest job status from the upstream via the BFF proxy. */
async function fetchJobStatus(
  jobId: string,
  apiKey: string,
): Promise<LLMCallStatusResponse> {
  return apiFetch<LLMCallStatusResponse>(`/api/llm/call/${jobId}`, apiKey);
}

/**
 * Polls the upstream job status until it reaches a terminal state, the signal
 * aborts, or the timeout elapses.
 */
export async function pollLLMCall(
  jobId: string,
  apiKey: string,
  options: PollOptions = {},
): Promise<LLMCallStatusData> {
  const {
    signal,
    intervalMs = POLL_INTERVAL_MS,
    timeoutMs = POLL_TIMEOUT_MS,
  } = options;

  const start = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Polling aborted", "AbortError");
    }

    const res = await fetchJobStatus(jobId, apiKey);
    if (!res.success || !res.data) {
      throw new Error(res.error || "Failed to retrieve job status.");
    }

    const status = (res.data.status || "").toLowerCase();
    if (SUCCESS_STATUSES.has(status)) {
      return res.data;
    }
    if (FAILURE_STATUSES.has(status)) {
      throw new Error(
        res.data.error_message ||
          res.error ||
          `Job ${status}. Please try again.`,
      );
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for the assistant's response.");
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException("Polling aborted", "AbortError"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
}

/**
 * Finds the first assistant response text from different API shapes,
 * including Kaapi (`output.content.value`), OpenAI Responses
 * (`output_text`, `content[]`), and Chat Completions
 * (`choices[].message.content`).
 */
function findText(node: unknown, depth = 0): string | null {
  if (node == null || depth > 12) return null;
  if (typeof node === "string") return node || null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findText(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;

  for (const key of ["output_text", "text", "value"]) {
    const v = obj[key];
    if (typeof v === "string" && v.length) return v;
  }

  const content = obj.content;
  if (typeof content === "string" && content.length) return content;
  if (content && typeof content === "object") {
    const r = findText(content, depth + 1);
    if (r) return r;
  }

  for (const key of ["message", "delta", "output"]) {
    if (obj[key]) {
      const r = findText(obj[key], depth + 1);
      if (r) return r;
    }
  }

  if (Array.isArray(obj.choices)) {
    const r = findText(obj.choices, depth + 1);
    if (r) return r;
  }

  return null;
}

export function extractAssistantText(
  response?: LLMResponseBody | null,
): string {
  if (!response) return "";
  const text = findText(response.output);
  if (text) return text;
  try {
    return JSON.stringify(response.output ?? "");
  } catch {
    return "";
  }
}

/**
 * The UI keeps `tools` as an array; the backend wants the equivalent fields
 * flattened onto `params` (`knowledge_base_ids`, `max_num_results`). Mirrors
 * the conversion done by SimplifiedConfigEditor when creating new versions.
 */
export function configToBlob(config: SavedConfig): ConfigBlob {
  const params: CompletionParams = {
    model: config.modelName,
    instructions: config.instructions ?? "",
  };

  if (config.temperature !== undefined && config.temperature !== null) {
    params.temperature = config.temperature;
  }

  const tools: Tool[] = config.tools ?? [];
  if (tools.length > 0) {
    const knowledge_base_ids = tools.flatMap((t) => t.knowledge_base_ids);
    if (knowledge_base_ids.length > 0) {
      params.knowledge_base_ids = knowledge_base_ids;
      params.max_num_results = tools[0].max_num_results;
    }
  }

  const blob: ConfigBlob = {
    completion: {
      provider: config.provider as "openai",
      type: config.type ?? "text",
      params,
    },
  };

  if (config.input_guardrails && config.input_guardrails.length > 0) {
    blob.input_guardrails = config.input_guardrails;
  }
  if (config.output_guardrails && config.output_guardrails.length > 0) {
    blob.output_guardrails = config.output_guardrails;
  }

  return blob;
}
