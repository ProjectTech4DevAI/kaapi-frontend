---
name: new-feature
description: Implement a feature, fix, or refactor in kaapi-frontend following the authoring contract (7-step procedure). Use for any non-trivial coding task in this repo — new pages, components, hooks, API proxies, or utils.
argument-hint: [description of the feature or change]
---

Implement the requested change by running the 7-step authoring contract. The goal is code indistinguishable in style and structure from the existing codebase — not just working code.

Task: $ARGUMENTS

## Procedure

### 0. Branch

If on `main`, create a feature branch first: `feat/<kebab-scope>` (e.g. `feat/evals-category`, `feat/collection-document-preview`); `fix/<kebab-scope>` for pure bugfixes.

### 1. Orient

Read `CLAUDE.md`, then the relevant `.claude/rules/*.md` file(s) for every area the task touches (components, hooks, api-and-data-fetching, styling, types-and-constants, utils, code-quality). Rules auto-load when you edit matching paths, but read them up front when planning.

### 2. Reuse-first scan (before writing anything)

Search for an existing thing to use or extend — never duplicate:

| Need                    | Search first                                                            |
| ----------------------- | ----------------------------------------------------------------------- |
| Component               | `app/components/`                                                       |
| Icon                    | `app/components/icons/` (never inline SVG)                              |
| Stateful/reusable logic | `app/hooks/` + barrel `index.ts`                                        |
| Network call            | `app/lib/` (`apiClient.ts`, `configFetchers.ts`, `guardrailsClient.ts`) |
| Shared shape/type       | `app/lib/types/`, `app/lib/models.ts`                                   |
| Constant / magic value  | `app/lib/constants.ts`                                                  |
| Domain helper           | `app/lib/utils/<domain>/`, `app/lib/utils.ts`                           |

Search by multiple names before concluding something doesn't exist.

### 3. Place correctly

One file = one responsibility. UI → `app/components/`; icon → `app/components/icons/`; reusable stateful logic → `app/hooks/` (re-export from `index.ts`); network logic (no React) → fetcher in `app/lib/`; shared shape → `app/lib/types/<domain>.ts`; constant/event name → `app/lib/constants.ts`; pure domain helper → `app/lib/utils/<domain>/`; backend proxy → `app/api/.../route.ts`; global state → `app/lib/context/`.

### 4. Write in-style

- Components: `"use client"` (only if interactive) → imports → `interface XxxProps` → `export default function Xxx({...}: XxxProps)`.
- Hooks: `"use client"` → `export interface UseXxxResult` → `export function useXxx(...): UseXxxResult`. All hook calls top-level, unconditional, before any early return.
- API routes: thin `try/catch` proxy via `apiClient`, return `NextResponse.json(data, { status })`.
- Styling: Tailwind template literals + variant `Record`s, semantic tokens — no `cn()`.
- Imports: always `@/` alias.

### 5. Respect the limits

≤ 500 LOC per file (ESLint error — build fails). Complexity ≤ 10, depth ≤ 4, ≤ 20 statements, ≤ 4 params (warns). Split at natural seams when approaching.

### 6. Comment the why, not the what

JSDoc on non-trivial files/exported functions; sparse inline comments (~5–10%) only for non-obvious logic or workarounds.

### 7. Verify

```bash
npm run lint && npm run build
```

Both must pass before declaring done. Fix every error and any warning the change introduced.
