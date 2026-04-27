/**
 * Client-side helpers for the Chat feature.
 *
 * Flow: POST /api/llm/call kicks off an async job and returns a job_id. The
 * upstream backend later POSTs the response to our /api/llm/webhook receiver,
 * which parks the result in an in-process store. We then poll
 * /api/llm/call/{job_id}/result against the BFF — 204 means "still waiting",
 * 200 means the webhook has fired and the body carries the LLM response.
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
} from "@/app/lib/types/chat";

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

/**
 * Generates a UUID used both as the `callback_id` segment in `callback_url`
 * and as the polling key. Falls back to a timestamp+random string on browsers
 * without `crypto.randomUUID` (which exists on https/localhost only).
 */
export function generateCallbackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Public origin of this app, as seen by the upstream backend.
 *
 * Reads NEXT_PUBLIC_APP_URL when set (point this at your ngrok / cloudflared
 * HTTPS URL in dev), otherwise falls back to `window.location.origin`. In dev
 * with an http://localhost origin the upstream rejects the call with
 * "Only HTTPS URLs are allowed" — set NEXT_PUBLIC_APP_URL to fix.
 */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildCallbackUrl(callbackId: string): string {
  return `${getPublicAppUrl()}/api/llm/webhook/${callbackId}`;
}

/**
 * Fetches the parked webhook result from the BFF. Returns null when the
 * webhook hasn't arrived yet (HTTP 204), throws on transport / shape errors.
 */
async function fetchWebhookResult(
  jobId: string,
  apiKey: string,
): Promise<LLMCallStatusResponse | null> {
  const res = await fetch(`/api/llm/call/${jobId}/result`, {
    headers: apiKey ? { "X-API-KEY": apiKey } : undefined,
    credentials: "include",
  });

  if (res.status === 204) return null;

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const message =
      (body.error as string) ||
      (body.message as string) ||
      `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return body as unknown as LLMCallStatusResponse;
}

export interface PollOptions {
  signal?: AbortSignal;
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Polls the BFF for a webhook-delivered result until it arrives, the signal
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

    const res = await fetchWebhookResult(jobId, apiKey);
    if (res) {
      if (!res.data) {
        throw new Error(res.error || "Empty response from webhook.");
      }
      const status = (res.data.status || "").toLowerCase();
      if (FAILURE_STATUSES.has(status) || res.success === false) {
        throw new Error(
          res.data.error_message ||
            res.error ||
            `Job ${status || "failed"}. Please try again.`,
        );
      }
      return res.data;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(
        "Timed out waiting for the assistant's response. Verify the webhook URL is reachable.",
      );
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
 * Walks an arbitrary value looking for the first string that looks like
 * assistant prose. Handles the Kaapi shape (`output.content.value`), OpenAI
 * Responses (`output_text` / nested `content[]`), and Chat Completions
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

  // `content` may be a string, an object (Kaapi: `{ format, value }`), or an
  // array of content parts (OpenAI Responses).
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
 * Builds the ad-hoc `ConfigBlob` payload from a fully-loaded SavedConfig.
 *
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
