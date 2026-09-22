---
name: new-feature
description: Implement a feature, fix, or refactor in kaapi-frontend following the repo's authoring contract (reuse-first, in-style, within-limits). Use for any non-trivial coding task in this repo — new pages, components, hooks, API proxies, or utils.
argument-hint: "[description of the feature or change]"
---

Implement the requested change so the result is **indistinguishable in style and structure from the existing codebase** — not just working code.

Task: $ARGUMENTS

> **Methodology is handled by `superpowers`.** For branching/worktrees, breaking the work into a plan, TDD, and finishing the branch, use the `superpowers` skills (`using-git-worktrees`, `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `finishing-a-development-branch`). This skill is _only_ the kaapi-frontend authoring contract: what to reuse, where code goes, and how it must look. Apply both together.

## The kaapi authoring contract

### 1. Orient

Read `CLAUDE.md`, then the relevant `.claude/rules/*.md` for every area the task touches (`components`, `hooks`, `data-fetching`, `styling`, `utils`, `code-quality`). Rules auto-load when you edit matching paths, but read them up front when planning.

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

Run `npm run lint && npm run build`. Both must pass before declaring done — fix every error and any warning the change introduced.
