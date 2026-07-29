---
paths:
  - "app/hooks/**"
---

# Hooks

Custom hooks live in `app/hooks/` and are re-exported from `app/hooks/index.ts` (barrel) for clean imports.

## Skeleton

```ts
"use client";

import { useState } from "react";
import type { SavedConfig } from "@/app/lib/types/configs";

export interface UseConfigsResult {
  configs: SavedConfig[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function useConfigs(options?: { pageSize?: number }): UseConfigsResult {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  // ...
  return { configs, isLoading, error, refetch };
}
```

Reference: `app/hooks/useConfigs.ts`, `app/hooks/usePaginatedList.ts`, `app/hooks/useInfiniteScroll.ts`, `app/hooks/useToast.ts`, `app/hooks/index.ts`.

## Rules

- **Name**: `use[Feature]` camelCase. File name matches the hook (`useConfigs.ts`).
- **`"use client"`** at the top.
- **Explicit return interface**: `export interface UseXxxResult { ... }`; the hook's signature is `): UseXxxResult`. Return a named object, not a tuple (except trivial cases).
- **Generics for reusable hooks**: `usePaginatedList<T>(...)`, `useInfiniteScroll<T>(...)` — parameterize the item type rather than hardcoding.
- **Refs for values that persist across renders without re-rendering**: `usePaginatedList` uses `skipRef`, `loadingMoreRef`. Use `useRef` for these, `useState` for render-affecting state.
- **No UI**: hooks hold state/effects only — no JSX. Network logic is delegated to pure fetchers in `app/lib/` (see the data-fetching rule); the hook orchestrates them.
- **Context-consumer hooks** throw if the provider is missing (e.g. `useToast`, `useAuth`).
- **Barrel**: add new hooks to `app/hooks/index.ts`.

## Hook placement & ordering (Rules of Hooks)

Every hook call — `useState`, `useRef`, `useEffect`, `use(params)`, and custom `useX()` — must sit at the **top level of the component/hook**, called unconditionally and in the same order on every render. `react-hooks/rules-of-hooks` is **on** and errors the build, but it only catches the hard violations — the ordering discipline below is on you.

- **Group all hook calls at the very top**, before deriving locals or any branching logic — context/data hooks and `useState`/`useRef` come first, then derived values:
  ```tsx
  "use client";
  export default function EvaluationsPage() {
    const { activeKey } = useAuth(); // context/data hooks first
    const toast = useToast();
    const [items, setItems] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    // only now derive + branch — every hook has already been called
    const hasItems = items.length > 0;
    // ...
  }
  ```
  For a Next 16 dynamic route, `params` is async (`params: Promise<{ id: string }>`) and unwrapped with React's `use(params)` — that's itself a hook, so it sits in the top block with the others, never below a `useState`.
- **No `return` (early-return / guard / `notFound()`) may appear before or between hook calls.** Guard _inside_ event handlers and effects instead — `if (!file) return;` at the top of `handleUpload` is fine; the same guard above a `useState` is a bug.
- **No hook inside a condition, loop, `&&`, ternary, or nested function.** Compute the condition into a variable and branch in the returned JSX, not around the hook.
- Order convention within the top block: context/data hooks (`useRouter`, `useAuth`, `useToast`) → `useState` → `useRef` → derived `useMemo`/`useCallback` → `useEffect`. See a real client page such as `app/(main)/evaluations/page.tsx`.

## Reuse before creating

`usePaginatedList`, `useInfiniteScroll`, `useConfigs`, `useToast`, `useCollections`, `useConfigPersistence` already cover common needs. Check `app/hooks/` (and `index.ts`) before writing a new one. For data fetching with pagination/search, reuse `usePaginatedList` rather than re-implementing skip/limit logic.

## Splitting

A hook near 500 LOC → extract pure helpers into `app/lib/` fetchers (`configFetchers.ts` pattern) or `app/lib/utils/<domain>/`, keep the hook as the orchestration layer.
