export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "textarea";
  required?: boolean;
  json?: boolean;
  jsonRequiredKeys?: string[];
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
        required: true,
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
        required: true,
      },
      {
        key: "public_key",
        label: "Public Key",
        placeholder: "pk-lf-xxxxx",
        required: true,
      },
      {
        key: "host",
        label: "Host URL",
        placeholder: "https://cloud.langfuse.com",
        required: true,
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
        required: true,
      },
    ],
  },
  {
    id: "google-gcp",
    name: "Google Vertex AI",
    description:
      "Run Gemini on Vertex AI. Batch jobs read and write through your own GCS bucket, authenticated with a service account.",
    credentialKey: "google-gcp",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "AIzaSy-xxxxx",
        type: "password",
        required: true,
      },
      {
        key: "project_id",
        label: "GCP Project ID",
        placeholder: "my-gcp-project",
        required: true,
      },
      {
        key: "location",
        label: "Region",
        placeholder: "us-central1",
        required: true,
      },
      {
        key: "gcs_bucket",
        label: "GCS Bucket",
        placeholder: "my-batch-bucket",
        required: true,
      },
      {
        key: "sa_key",
        label: "Service Account Key (JSON)",
        placeholder: '{\n  "type": "service_account",\n  "project_id": "…"\n}',
        type: "textarea",
        required: true,
        json: true,
        jsonRequiredKeys: [
          "type",
          "project_id",
          "private_key",
          "client_email",
          "token_uri",
        ],
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Connect your Anthropic account to use Claude models",
    credentialKey: "anthropic",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "sk-ant-xxxxx",
        type: "password",
        required: true,
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
        required: true,
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
        required: true,
      },
    ],
  },
];

export interface APIKey {
  id: string;
  label: string;
  masked?: string;
  createdAt?: string;
  key?: string;
}

export interface ApiKeyMeta {
  id: string;
  label: string;
  masked: string;
  createdAt: string;
}

export interface AddApiKeyRequest {
  key?: string;
  label?: string;
}
