export interface ValidatorMeta {
  validator_type: string;
  validator_name: string;
  description: string;
}

export interface ValidatorConfigSchema {
  title: string;
  type: string;
  properties: Record<
    string,
    {
      type?: string;
      title?: string;
      default?: unknown;
      enum?: string[];
      anyOf?: unknown[];
      items?: unknown;
      $ref?: string;
      const?: string;
    }
  >;
  $defs?: Record<
    string,
    {
      enum?: string[];
      type?: string;
    }
  >;
  required?: string[];
  additionalProperties?: boolean;
}

export interface Validator {
  type: string;
  config: ValidatorConfigSchema;
}

export interface SavedValidatorConfig {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
  stage?: string;
  on_fail_action?: string;
  is_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  organization_id?: number;
  project_id?: number;
  [key: string]: unknown;
}

export function formatValidatorName(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface OrgContext {
  organization_id: number;
  project_id: number;
}

export interface ValidatorUpdatePayload {
  name?: unknown;
  type?: unknown;
  stage?: unknown;
  on_fail_action?: unknown;
  is_enabled?: unknown;
}

export function buildValidatorUpdatePayload(
  configValues: Record<string, unknown>,
): ValidatorUpdatePayload {
  const { name, type, stage, on_fail_action, is_enabled } = configValues;
  return { name, type, stage, on_fail_action, is_enabled };
}
