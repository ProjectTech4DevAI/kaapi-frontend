import { NextRequest } from "next/server";
import type {
  ValidatorConfigSchema,
  ValidatorMeta,
  ValidatorUpdatePayload,
} from "@/app/lib/types/guardrails";
import { VALIDATOR_META } from "@/app/lib/data/guardrails/validators";

export const VALIDATOR_META_BY_TYPE: Record<string, ValidatorMeta> =
  Object.fromEntries(VALIDATOR_META.map((v) => [v.validator_type, v]));

/**
 * Builds the backend endpoint for validator configs, forwarding
 * organization_id and project_id query params from the incoming request.
 */
export function buildValidatorConfigEndpoint(
  request: NextRequest,
  config_id?: string,
): string {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const organizationId = searchParams.get("organization_id");
  const projectId = searchParams.get("project_id");
  if (organizationId) params.append("organization_id", organizationId);
  if (projectId) params.append("project_id", projectId);
  const qs = params.toString();
  const base = config_id
    ? `/api/v1/guardrails/validators/configs/${config_id}`
    : `/api/v1/guardrails/validators/configs`;
  return `${base}${qs ? `?${qs}` : ""}`;
}

/**
 * Resolves a `$ref` pointer like "#/$defs/GuardrailOnFail" against the
 * provided `$defs` map and returns its `enum` values (or an empty array).
 */
export function resolveRef(
  ref: string,
  defs: ValidatorConfigSchema["$defs"],
): string[] {
  const key = ref.replace("#/$defs/", "");
  return defs?.[key]?.enum ?? [];
}

/**
 * Builds the initial form values from a validator's config schema by
 * pulling each property's `default` (skipping `type`).
 */

export function buildDefaultValues(
  schema: ValidatorConfigSchema,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (key === "type") continue;
    if ("default" in prop) {
      values[key] = prop.default;
    }
  }
  return values;
}

export function buildValidatorUpdatePayload(
  configValues: Record<string, unknown>,
): ValidatorUpdatePayload {
  const { name, type, stage, on_fail_action, is_enabled } = configValues;
  return {
    name: name as string,
    type: type as string,
    stage: stage as string,
    on_fail_action: on_fail_action as string,
    is_enabled: is_enabled as boolean,
  };
}
