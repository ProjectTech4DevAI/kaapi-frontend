import { Credential, ProviderDef } from "@/app/lib/types/credentials";

export function getExistingForProvider(
  provider: ProviderDef,
  creds: Credential[],
): Credential | null {
  return creds.find((c) => c.provider === provider.credentialKey) || null;
}
