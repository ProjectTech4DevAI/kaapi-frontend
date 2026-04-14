import { NextRequest } from "next/server";

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
