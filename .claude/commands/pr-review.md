---
description: Review a PR (or current branch's diff against main) against kaapi-frontend conventions.
argument-hint: [PR number | "branch"]
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(git diff:*), Bash(git log:*), Read, Grep, Glob
---

You are reviewing a pull request (or the current branch's diff against `main`) in this Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 frontend, with a BFF layer in `app/api/*` that proxies to the FastAPI backend.

Argument from the user: `$ARGUMENTS`

> **Scope of this command — kaapi-specific only.** For _generic_ review depth (correctness bugs, perf, async/race conditions, a11y, generic security), lean on the `superpowers` code-review skills and the built-in `/code-review`. This checklist covers only what those can't know: kaapi-frontend's conventions, file layout, and contracts. Run them alongside each other; don't duplicate the generic findings here.

## Gather the diff

1. Argument is a PR number → `gh pr view <n>` + `gh pr diff <n>`.
2. Argument is empty → `gh pr list` and ask which one. Exception: argument is "branch" / "this branch" / "my changes" → `git diff main...HEAD` + `git log main..HEAD --oneline`.
3. `Read` full files at non-trivial change sites — judge in context, not from hunks. Bugs hide in the parts of the file the diff didn't touch (effects, memo deps, conditional renders).
4. `Grep` for duplication, reused literals, unused symbols, near-identical components/hooks.

## What to check (kaapi conventions)

The authoritative rules live in `.claude/rules/*` and `CLAUDE.md` — they auto-load by path. Flag any drift from them. Summary of the highest-signal checks:

### Conventions & structure

- **File size**: no file over **500 LOC** (`max-lines` ESLint error). A change pushing a component past it must split — subcomponents/hooks/utils/types into their own files. See `.claude/rules/code-quality.md`.
- **SRP**: a component that fetches + transforms + renders is doing three things. Fetching → hook in `app/hooks/`; logic → util in `app/lib/utils/<domain>/`; component stays presentational.
- **Imports**: `@/...` alias, never relative `../../..` chains.
- **`"use client"`** only where state/effects/handlers/browser APIs are actually used — flag it on pure markup.

### Styling (`.claude/rules/styling.md`)

- Tailwind first; `app/globals.css` only for what Tailwind can't express. Inline `style={{}}` only for genuinely dynamic values.
- Design tokens (`text-text-primary`, `bg-accent-primary`, `border-border`, status colors) — **not** raw `text-gray-500` / hex.
- **No `cn()` / `clsx()`** — compose with template literals + ternaries and variant `Record`s.

### Reuse / DRY — grep before approving (`.claude/rules/*`)

- New component → check `app/components/` (`Button`, `Modal`, `Field`, `MultiSelect`, `Toast`, `Loader`, `PageHeader`, `InfoTooltip`, `CodeBlock`, `ErrorModal`, `GatePopover`).
- New icon → **must** be a hand-authored React component in `app/components/icons/` (domain subfolder + barrel export). **Inline SVG in feature code is a blocker.**
- New hook → check `app/hooks/` (`useToast`, `useConfigs`, `useCollections`, `useInfiniteScroll`, `usePaginatedList`, `useConfigPersistence`).
- New util → check `app/lib/utils.ts`, `app/lib/utils/<domain>/`. New type → `app/lib/types/` / `app/lib/models.ts` (flag locally redefined shapes).
- Constants → `app/lib/constants.ts`. Storage keys via `STORAGE_KEYS`; events in the `kaapi:*` namespace.

### App Router & routing

- New routes land in the correct group: `app/(auth)/` (unauthenticated) or `app/(main)/` (authenticated).
- **Route gating reflected in `middleware.ts`** (`PUBLIC_ROUTES`, `GUEST_ONLY_ROUTES`, superuser-only `/settings/*`). Adding a `/settings/*` page without confirming superuser gating is a security issue.
- `params` is async in Next 15+/16 (`params: Promise<{ id: string }>`). Dynamic segments `[id]`.

### BFF / API route handlers (`app/api/*`) — `.claude/rules/data-fetching.md`

- Use `apiClient(request, endpoint, options)` (or `guardrailsClient`) — never raw `fetch(BACKEND_URL...)`. Route handlers stay thin: parse → call client → relay.
- Forward backend `status` through (`NextResponse.json(data, { status })`); don't swallow non-2xx into 200. Endpoint paths preserved verbatim (trailing-slash contract).
- Don't log request bodies/tokens/cookies; `console.error("Proxy error:", error)` is the convention.

### Client-side data fetching

- Browser calls use `clientFetch` / `apiFetch` so 401 refresh + `AUTH_EXPIRED_EVENT` are wired in. Raw `fetch("/api/...")` in a component is a bug.
- User-facing error messages come from `extractErrorMessage` (`error || message || detail`) — don't reinvent the parser.
- SWR is used selectively (cached, revalidated reads). Don't sprinkle `useSWR` everywhere.
- Loading / error / empty states all handled — a list that renders `[]` on API failure is broken UX.

### Context & global state

- Auth → `useAuth()`; app/sidebar → `useApp()`; toasts → `useToast()`. Don't reach into cookies / `localStorage` when a context exposes the same data. `localStorage` always via `STORAGE_KEYS`.

## How to write the comments

- Cite `path:line`. Show the suggested change inline when short.
- **Name the failure mode**, not just the smell. Pair criticism with a concrete fix (a snippet, or "see `app/components/Modal.tsx`").
- **Question form** for judgment calls; **direct form** for unambiguous bugs. Hedge on judgment, not on correctness.
- Tag severity: `VERY IMPORTANT:` / `MUST:` for security / data-loss / auth-gating / contract breaks; `nit:` for tiny cleanups.

## Output format

```
## Summary
<1–3 sentences: what the PR does + verdict (approve / approve with nits / request changes).>

## Blocking issues
- <correctness, security, auth-gating, or convention violations. Each: path:line, what's wrong, why it breaks, suggested fix.>

## Suggestions
- <non-blocking improvements>

## Nits
- <style, naming, tiny cleanups — prefix `nit:`>
```

Each item gets one bullet — no item in more than one section. Domain tags where useful: `[a11y]`, `[perf]`, `[security]`, `[bff]`, `[middleware]`, `[follow-up]`. Drop empty sections. Read-only — do not modify files during the review.
