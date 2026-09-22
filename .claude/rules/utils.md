---
paths:
  - "app/lib/utils.ts"
  - "app/lib/utils/**"
---

# Utilities

Two tiers:

- **`app/lib/utils.ts`** — general, cross-domain helpers (time formatting, storage, api-key access).
- **`app/lib/utils/<domain>/`** — domain-specific helpers grouped by feature.

Reference: `app/lib/utils.ts`, `app/lib/utils/analytics/formatValue.ts`, `app/lib/utils/guardrails.ts`, plus `evaluation.ts`, `csv.ts`, `selectOptions.ts`, `knowledgeBaseCache.ts`, etc.

## Layout

```
app/lib/utils.ts                  # shared: timeAgo, formatRelativeTime, clearAllStorage, getApiKey
app/lib/utils/
├── analytics/
│   ├── formatValue.ts            # currency/token/compact formatting
│   ├── mergeChartData.ts
│   └── normalizeSeries.ts
├── evaluation.ts                 # single-file domain util
├── evaluationExport.ts
├── guardrails.ts
├── csv.ts
├── selectOptions.ts
├── collectionEnrichment.ts
├── documentPreview.ts
└── knowledgeBaseCache.ts
```

A domain gets its **own folder** when it has multiple util files (e.g. `analytics/`); a single-file domain util sits directly under `app/lib/utils/` (e.g. `guardrails.ts`).

## Rules

- **Pure functions**: take inputs, return outputs, no React, no UI state. Either `export function name()` or `export const name = () =>` — both appear; match the surrounding file.
- **Domain constants/lookups co-locate with the util** that uses them:

  ```ts
  export const CURRENCY_METRICS: AnalyticsMetric[] = [
    "cost",
    "eval_cost",
    "cost_all",
  ];

  export function formatMetricValue(
    value: number,
    metric: AnalyticsMetric,
  ): string {
    if (CURRENCY_METRICS.includes(metric)) {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  ```

- **Precompute lookups** at module load where it helps:
  ```ts
  export const VALIDATOR_META_BY_TYPE: Record<string, ValidatorMeta> =
    Object.fromEntries(VALIDATOR_META.map((v) => [v.validator_type, v]));
  ```
- **Defensive parsing** for browser/storage/date input (guard `typeof window === "undefined"`, wrap `JSON.parse` in try/catch, normalize UTC timestamps) — see `getApiKey`, `formatRelativeTime` in `app/lib/utils.ts`.
- **Endpoint/query builders** belong in domain utils (e.g. `buildValidatorConfigEndpoint` in `guardrails.ts`), keeping route handlers thin.

## Reuse before creating

Check `app/lib/utils.ts`, `app/lib/utils/<domain>/`, and `app/hooks/` before adding a helper. If the same logic appears in 2+ places, extract it here (DRY — `sonarjs/no-identical-functions` warns on duplicates).
