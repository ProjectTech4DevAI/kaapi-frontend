---
paths:
  - "app/lib/types/**"
  - "app/lib/models.ts"
  - "app/lib/constants.ts"
---

# Types & constants

## Types

Shared types live in `app/lib/types/<domain>.ts` (one file per domain) and `app/lib/models.ts`. Import from there — do not redefine shapes locally.

Reference: `app/lib/types/configs.ts`, `app/lib/types/auth.ts`, `app/lib/types/toast.ts`, `app/lib/types/evaluation.ts`, `app/lib/types/nav.ts`, `app/lib/models.ts`.

### Rules

- **`interface` for object shapes** — props, API responses, data models, cache shapes.
  ```ts
  export interface User {
    id: number;
    email: string;
    is_superuser: boolean;
  }
  ```
- **`type` for unions / discriminated unions / aliases**.
  ```ts
  export type ToastType = "success" | "error" | "info" | "warning";
  export type ConfigType = "text" | "stt" | "tts";
  export type ScoreObject =
    | NewScoreObjectV2
    | BasicScoreObject
    | LegacyScoreObject;
  ```
- **Field naming follows the backend** (snake_case in API/data shapes: `config_id`, `is_active`, `input_guardrails`). UI-derived fields use camelCase (`latestVersion`, `totalVersions`).
- **Optional/nullable** mirror the API: `score?: ScoreObject | null`. Open-ended bags use an index signature: `[key: string]: unknown`.
- **Compose response types** with a generic wrapper where one exists: `export type ConfigListResponse = APIResponse<ConfigPublic[]>;`.
- **Co-locate domain constants with their types** where natural — `app/lib/models.ts` keeps `MODEL_OPTIONS` next to `ModelOption` and a `getModelsForType()` helper.
- Prefer **union string literals over enums**.

## Constants

Global constants live in `app/lib/constants.ts`.

### Rules

- **Scalars**: `UPPER_SNAKE_CASE`.
  ```ts
  export const APP_NAME = "Kaapi Konsole";
  export const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
  export const DEFAULT_PAGE_LIMIT = 10;
  export const MAX_DOCUMENT_SIZE_MB = 25;
  export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
  ```
- **Grouped keys** as a frozen object with `as const` (gives literal types):
  ```ts
  export const STORAGE_KEYS = {
    API_KEYS: "kaapi_api_keys",
    SESSION: "kaapi_session",
    CONFIGS_CACHE: "kaapi_configs_cache",
  } as const;
  ```
  `localStorage` access always goes through `STORAGE_KEYS`, never bare strings.
- **Option arrays for selects** as typed const arrays:
  ```ts
  export const PROVIDES_OPTIONS = [
    { value: "openai", label: "OpenAI" },
    { value: "google", label: "Google" },
  ];
  ```
- **Typed record config**: `export const TOAST_CONFIG: Record<ToastType, {...}> = { ... }`.
- **Event names as constants** in the `kaapi:*` namespace — no magic strings for `window` events:
  ```ts
  export const AUTH_EXPIRED_EVENT = "kaapi:auth-expired";
  export const CACHE_INVALIDATED_EVENT = "kaapi:config-cache-invalidated";
  ```
- Small derivation helpers can live in `constants.ts` (e.g. `getRecentYearOptions(count)`).

### No magic values

Any string/number used in 2+ places, any storage key, any event name, any limit/threshold → put it in `constants.ts` and import it. (`sonarjs/no-duplicate-string` warns at 5 repeats.)
