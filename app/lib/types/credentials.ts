export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
}

export interface ProviderDef {
  id: string;
  name: string;
  description: string;
  /** Matches the `provider` field returned by the API */
  credentialKey: string;
  fields: FieldDef[];
}

export interface Credential {
  id: number | string;
  provider: string;
  is_active: boolean;
  credential: Record<string, string>;
  inserted_at?: string;
  updated_at?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Connect your OpenAI account to use GPT models in evaluations",
    credentialKey: "openai",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "sk-xxxxx-xxxxx-xxxxx",
        type: "password",
      },
    ],
  },
  {
    id: "langfuse",
    name: "Langfuse",
    description: "Integrate Langfuse for LLM observability and tracing",
    credentialKey: "langfuse",
    fields: [
      {
        key: "secret_key",
        label: "Secret Key",
        placeholder: "sk-lf-xxxxx",
        type: "password",
      },
      { key: "public_key", label: "Public Key", placeholder: "pk-lf-xxxxx" },
      {
        key: "host",
        label: "Host URL",
        placeholder: "https://cloud.langfuse.com",
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    description:
      "Use Google AI (Gemini) models for speech and text evaluations",
    credentialKey: "google",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "AIzaSy-xxxxx",
        type: "password",
      },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "High-quality text-to-speech synthesis via ElevenLabs",
    credentialKey: "elevenlabs",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "sk_xxxxx",
        type: "password",
      },
    ],
  },
  {
    id: "sarvamai",
    name: "Sarvam AI",
    description: "Indian language speech and text models via Sarvam AI",
    credentialKey: "sarvamai",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "xxxxx",
        type: "password",
      },
    ],
  },
];

export interface APIKey {
  id: string;
  label: string;
  key: string;
  provider: string;
  createdAt?: string;
}
