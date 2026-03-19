import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { formatDistanceToNow } from "date-fns";

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function getExistingForProvider(
  provider: ProviderDef,
  creds: Credential[],
): Credential | null {
  return creds.find((c) => c.provider === provider.credentialKey) || null;
}
