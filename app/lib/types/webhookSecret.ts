export type WebhookSecretFailureReason =
  | "webhook_secret_missing"
  | "webhook_secret_placeholder"
  | "webhook_secret_invalid_format";

export interface WebhookSecretResult {
  ok: boolean;
  secret?: string;
  reason?: WebhookSecretFailureReason;
}
