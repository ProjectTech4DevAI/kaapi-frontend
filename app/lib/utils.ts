import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { formatDistanceToNow } from "date-fns";

export function timeAgo(dateStr: string): string {
  const date =
    dateStr.includes("Z") || dateStr.includes("+")
      ? new Date(dateStr)
      : new Date(dateStr + "Z");

  return formatDistanceToNow(date, { addSuffix: true });
}

export function getExistingForProvider(
  provider: ProviderDef,
  creds: Credential[],
): Credential | null {
  return creds.find((c) => c.provider === provider.credentialKey) || null;
}
