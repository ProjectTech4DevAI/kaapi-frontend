export function isForbiddenApiError(error: unknown): boolean {
  if (!error || !(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    /request failed:\s*403/i.test(error.message) ||
    message.includes("forbidden") ||
    message.includes("not enabled") ||
    message.includes("permission denied")
  );
}

export function handleForbiddenApiError(
  error: unknown,
  onForbidden?: () => void,
): boolean {
  if (!isForbiddenApiError(error)) return false;
  onForbidden?.();
  return true;
}
