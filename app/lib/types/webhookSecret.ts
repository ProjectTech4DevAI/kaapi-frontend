export type WebhookSecretFailureReason =
  | "prompt_improvement_webhook_secret_missing"
  | "prompt_improvement_webhook_secret_placeholder"
  | "prompt_improvement_webhook_secret_invalid_format";

export interface WebhookSecretResult {
  ok: boolean;
  secret?: string;
  reason?: WebhookSecretFailureReason;
}
