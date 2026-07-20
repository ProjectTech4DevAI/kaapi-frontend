const HEX_SECRET_REGEX = /^[a-f0-9]{32,}$/i;

const PLACEHOLDER_VALUES = new Set([
  "changeme",
  "change_me",
  "secret",
  "test",
  "password",
  "todo",
]);

export interface WebhookSecretResult {
  ok: boolean;
  secret?: string;
  reason?:
    | "prompt_improvement_webhook_secret_missing"
    | "prompt_improvement_webhook_secret_placeholder"
    | "prompt_improvement_webhook_secret_invalid_format";
}

/**
 * Read + validate the secret. Returns a discriminated result so callers can
 * surface a specific error code instead of a generic 500.
 */
export function readWebhookSecret(): WebhookSecretResult {
  const raw = process.env.PROMPT_IMPROVEMENT_WEBHOOK_SECRET;
  if (!raw) {
    return { ok: false, reason: "prompt_improvement_webhook_secret_missing" };
  }
  const trimmed = raw.trim();
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) {
    return {
      ok: false,
      reason: "prompt_improvement_webhook_secret_placeholder",
    };
  }
  if (!HEX_SECRET_REGEX.test(trimmed)) {
    return {
      ok: false,
      reason: "prompt_improvement_webhook_secret_invalid_format",
    };
  }
  return { ok: true, secret: trimmed };
}
