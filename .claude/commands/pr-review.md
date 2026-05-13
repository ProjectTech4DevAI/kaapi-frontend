---
description: Review a PR (or current branch's diff against main) against kaapi-frontend conventions and personal review checklist.
argument-hint: [PR number | "branch"]
---

You are reviewing a pull request (or the current branch's diff against `main`) in this Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS 4 frontend, with a BFF layer in `app/api/*` that proxies to the FastAPI backend.

Argument from the user: `$ARGUMENTS`

## Gather the diff

1. Argument is a PR number → `gh pr view <n>` + `gh pr diff <n>`.
2. Argument is empty → `gh pr list` and ask which one. Exception: argument is "branch" / "this branch" / "my changes" → `git diff main...HEAD` + `git log main..HEAD --oneline`.
3. `Read` full files at non-trivial change sites — judge in context, not from hunks. Components hide bugs in the parts of the file the diff didn't touch (effects, memo deps, conditional renders).
4. `Grep` for duplication, reused literals, unused symbols, near-identical components/hooks.

## What to check

Skip any section in the output that has nothing notable.

### Conventions

- File size: **no file over 500 LOC** (per `CLAUDE.md`). If a change pushes a component past it, push to split — extract subcomponents / hooks / utils / types into their own files.
- Single Responsibility: a component that fetches, transforms, and renders is doing three things. Data fetching → custom hook in `app/hooks/`. Business logic → util in `app/lib/utils/<domain>/`. Component stays presentational.
- Import alias: use `@/...` (from project root), not relative `../../...` chains. tsconfig paths set `@/*` → `./*`.
- `"use client"` directive only where actually needed (state, effects, event handlers, browser APIs). Server components by default in App Router; flag client directives that wrap pure markup.
- Tailwind first; reach for `app/globals.css` only when Tailwind can't express it. Inline `style={{ ... }}` is a smell — flag it unless the value is genuinely dynamic (computed pixel offset, runtime color from data).
- Color tokens via the design system (`text-text-primary`, `bg-accent-primary`, `border-border`, etc.) — not raw `text-gray-500` / hex literals. Cross-check against `Button.tsx` / `globals.css` for the canonical palette.
- TypeScript strict: no `any` (use `unknown` + narrowing, or a real type). `// eslint-disable-next-line @typescript-eslint/no-explicit-any` needs a justifying comment, not a silent suppression.
- Type hints on every prop / return. Prefer `interface` for public component props, `type` for unions / utility shapes — match the file's surroundings.
- `npm` is the runner; lockfile is `package-lock.json`. Flag stray `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb` changes.

### Reuse (DRY) — grep before approving

- New component: check `app/components/` first. `Button`, `Modal`, `Field`, `MultiSelect`, `Toast`, `Loader`, `PageHeader`, `InfoTooltip`, `CodeBlock`, `ErrorModal`, `GatePopover` already exist. Composing one beats authoring a new one.
- New icon: **must** live in `app/components/icons/` as a hand-authored React component, exported from `app/components/icons/index.ts`. Inline SVGs in feature code are a blocker — name the existing icon if there is one.
- New hook: check `app/hooks/` (`useToast`, `useConfigs`, `useCollections`, `useInfiniteScroll`, `usePaginatedList`, `useConfigPersistence`, `useSttData`).
- New util: check `app/lib/utils.ts`, `app/lib/utils/<domain>/`, `app/lib/promptEditorUtils.ts`, `app/lib/configFetchers.ts`. Domain-specific helpers belong under `app/lib/utils/<domain>/`, not feature folders.
- New type: shared types live in `app/lib/types/` and `app/lib/models.ts` — flag locally redefined shapes that duplicate an existing one.
- Constants: `app/lib/constants.ts`. Storage keys go in `STORAGE_KEYS`; events use a `kaapi:*` namespace (see `AUTH_EXPIRED_EVENT`, `CACHE_INVALIDATED_EVENT`).
- Three near-identical components or three copy-pasted fetchers usually collapse into one parameterized version.

### App Router & routing

- New routes land under the correct group: `app/(auth)/` (unauthenticated) or `app/(main)/` (authenticated app surface). Don't put authenticated features at the root.
- Public, guest-only, and superuser-only routes must be reflected in `middleware.ts` (`PUBLIC_ROUTES`, `GUEST_ONLY_ROUTES`, `PATHNAME_STARTS_WITH`). Adding a `/settings/*` page without confirming superuser gating is a security issue.
- `loading.tsx` / `error.tsx` / `not-found.tsx` for non-trivial route segments where they help UX.
- Dynamic segments use `[id]` (not `[slug]` unless it's actually a slug). Params typed; `params` is async in Next 15+/16 (`params: Promise<{ id: string }>`).
- `metadata` / `generateMetadata` set for top-level pages; don't ship `<title>Untitled</title>`.

### BFF / API route handlers (`app/api/*`)

- Use `apiClient(request, endpoint, options)` from `@/app/lib/apiClient` — never raw `fetch(BACKEND_URL...)`. The client relays `X-API-KEY` + `Cookie` automatically.
- Route handlers stay thin: parse → call `apiClient` → relay. Business logic does not belong here.
- Endpoint paths preserved verbatim — the recent "remove trailing slashes" migration is a contract with the backend; flag drift in either direction.
- Error response shape: `{ error, details }` with the original status when possible (see `app/api/evaluations/route.ts` for the template). Don't swallow non-2xx into 200.
- Don't log request bodies, tokens, or cookies. `console.error("Proxy error:", error)` is the existing convention — match it.
- New route handler → confirm the equivalent backend endpoint exists; don't ship a 404 proxy.

### Client-side data fetching

- Use `clientFetch(endpoint, options)` for browser calls so 401 refresh + `AUTH_EXPIRED_EVENT` are wired in. Raw `fetch("/api/...")` in a component bypasses this and is a bug.
- SWR is used selectively — adopt it for _cached, revalidated_ reads (lists, dashboards). One-shot mutations stay on `clientFetch`. Don't sprinkle `useSWR` everywhere "for parity."
- Error messages surfaced to users come from `extractErrorMessage` (reads `error || message || detail`) — don't reinvent the parser.
- Loading / error / empty states: all three must be handled. A list that renders `[]` silently when the API fails is broken UX.

### React 19 / Hooks

- Hook rules: top-level only, no calls inside conditionals or loops. Flag any custom hook that doesn't start with `use`.
- `useEffect` dependency arrays: every referenced value listed, or document why it's intentionally omitted. Stale-closure bugs are easy to miss in review — read the effect body and trace each identifier.
- `useEffect` for derivation is an antipattern — compute during render or with `useMemo`. Effects are for syncing with external systems.
- `useCallback` / `useMemo` only when there's a real perf reason (passed to memoized children, expensive computation). Wrapping every function is noise.
- Cleanup functions on effects that start timers, subscribe, or fetch (abort on unmount via `AbortController`).
- `key` props on list items: stable, unique, **not** the array index when the list reorders / filters.
- State shape: derived state is a bug magnet — if `selected` can be computed from `items` + `selectedId`, don't store both.

### Context & global state

- Auth → `useAuth()` from `@/app/lib/context/AuthContext`. App / sidebar → `useApp()` from `@/app/lib/context/AppContext`. Toasts → `useToast()` from `@/app/hooks/useToast` (or `@/app/components/Toast`). Don't reach into the cookies / `localStorage` directly when a context exposes the same data.
- Zustand stores live in `app/lib/store/` — use one when state is shared across distant components and prop-drilling is painful. Don't introduce a new store for what context already covers.
- `localStorage` access goes through `STORAGE_KEYS` in `constants.ts`, never bare strings.

### Forms & validation

- Validation messages user-facing — say what's wrong, not "Invalid input". Required-field errors flagged inline near the field.
- Disable submit while a request is in flight; don't let users double-click into duplicate requests.
- Controlled inputs: every `value` paired with `onChange`. Mixed controlled/uncontrolled (`value={x ?? undefined}`) produces React warnings — flag it.

### Accessibility

- Buttons are `<button>` (or the `Button` component), not `<div onClick>`. Anchors with `href` for navigation, buttons for actions.
- `aria-label` on icon-only buttons. `alt=""` is fine for decorative images, omitting it is not.
- Modals: focus trap, `Escape` to close, focus restored on close. `Modal.tsx` handles this — flag bespoke modal divs that reimplement it badly.
- Color contrast: don't rely on color alone for status (error states need an icon / text too).
- Keyboard reachable: every interactive control receives focus and reacts to `Enter` / `Space`.

### Performance

- Don't import large libraries at the top level when only one route needs them. `next/dynamic` with `{ ssr: false }` for client-only heavy components.
- `next/image` for raster images, with `width` / `height` set. Plain `<img>` slips through CLS / lazy-loading defaults.
- Lists that can grow unbounded → virtualize (`useInfiniteScroll` / `usePaginatedList` already exist).
- Re-render hotspots: a parent updating every keystroke re-rendering a 10k-row table is the kind of thing review catches. Look for `useMemo` / `React.memo` opportunities on heavy children only when the prop chain is stable.
- Cache invalidation: when mutating, invalidate the right SWR key / local cache (`CACHE_INVALIDATED_EVENT`). Don't leave stale UI after a successful write.

### Naming

- Components / files: `PascalCase.tsx`. Hooks: `useThing.ts`. Utils / types: `camelCase.ts`. Route files use Next conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`).
- Variables / functions `camelCase`; constants `UPPER_SNAKE`; types / interfaces `PascalCase`; enum-like unions named with a trailing intent (`ToastType`, not `Type`).
- `list*` / plural for lists, `get*` / singular for one. Boolean props prefixed `is` / `has` / `should`.
- No leftover names from copy-pasting a sibling file (a `<Datasets>` file that still references `evaluation` somewhere is a tell).
- Import order: external packages → `@/...` aliases → relative — consistent with the rest of the repo.

### Error handling

- `try` wraps only the lines that can throw. Wrapping the whole render or the whole event handler hides the actual failure site.
- Don't swallow errors silently — at minimum `console.error` and surface a toast (`useToast().error(...)`).
- Don't leak internals to the user — stack traces, raw backend payloads, file paths stay in `console.error`; the toast message is human-readable.
- `error instanceof Error ? error.message : String(error)` is the canonical narrow — match it.

### Async correctness

- `async` event handlers and effects: handle the rejected case. Unhandled promise rejection in a button click = silent failure.
- Race conditions: a component that triggers a fetch on every keystroke needs cancellation (`AbortController`) or a "latest request wins" guard, otherwise the slower response overwrites the faster one.
- Don't `await` inside a render — only in handlers / effects.

### Security

- No secrets / tokens in client bundles. Anything in `NEXT_PUBLIC_*` is public; don't put API secrets there.
- `dangerouslySetInnerHTML` is a blocker unless the input is provably trusted _and_ sanitized; name the sanitizer.
- User-controlled URLs in `<a href>` / `window.open` / `router.push`: validate scheme (no `javascript:` / `data:`); for external links add `rel="noopener noreferrer"`.
- File uploads: validate type + size client-side (see `MAX_DOCUMENT_SIZE_BYTES`, `ACCEPTED_DOCUMENT_TYPES`), and confirm the backend re-validates. Client check is UX, not security.
- No secrets / `.env*` files committed. `process.env.X` reads on the client must be `NEXT_PUBLIC_*` and intentionally public.

### Pages & UX details

- Empty states: an empty list / search-no-results / first-time state — have one, not just whitespace.
- Loading states: skeleton (`ConfigLibrarySkeleton`, `DatasetListSkeleton` exist) over a centered spinner for content-heavy pages.
- Confirmation for destructive actions (delete dataset, remove key). `ErrorModal` / `Modal` are reusable for this.
- Toasts for transient feedback; modals for blocking decisions; inline errors for field-level problems — don't mix them up.
- Mobile / responsive: the recent eval-card responsiveness work is the bar — flag fixed widths that break < 768px.

### Cleanup

- Unused imports / props / state / params / files. Delete, don't leave `_unused` placeholders.
- `console.log` / `debugger` removed. `console.error` allowed at proxy boundaries (matches `app/api/*` convention).
- Commented-out code is a blocker — use git history.
- Empty `index.ts` re-exports for modules that aren't actually consumed.
- ESLint disables: each `eslint-disable` needs a one-line reason; bare disables get pushed back on.

### Tests

- This repo doesn't ship a test runner yet — when a PR adds non-trivial logic (a util, a hook, a state machine), call it out as a follow-up rather than gate the merge.
- For UI: confirm the author actually ran `npm run dev` and exercised the golden path + a failure path. Type-checking is not feature-checking.

## How to write the comments

- Cite `path:line`. Show the suggested change inline when short.
- **Name the failure mode**, not just the smell. Weak: "this useEffect has an empty dep array." Strong: "the effect reads `selectedId` but doesn't list it — it'll keep the first value forever, so changing the selection won't refetch."
- **Pair criticism with a concrete fix**: a snippet, a link to an existing component / hook that already does it right (`see app/components/Modal.tsx`), or the constant to use.
- **Question form** for judgment calls ("Why a fresh fetch here instead of reusing `useConfigs`?"). **Direct form** for unambiguous bugs.
- Hedge ("maybe", "I think") on judgment, not on correctness.
- Defer non-blocking work explicitly: "Not for this PR — worth a follow-up." Don't let style nits gate a merge.
- Tag severity: `VERY IMPORTANT:` / `MUST:` for security / data-loss / auth-gating / contract breaks; `nit:` for tiny cleanups. Approval can carry caveats ("approved, please resolve X before merging") — never just rubber-stamp.

## Output format

```
## Summary
<1–3 sentences: what the PR does + verdict (approve / approve with nits / request changes). Caveats on approval are fine.>

## Blocking issues
- <correctness, security, auth-gating, or convention violations. Each: path:line, what's wrong, why it breaks, suggested fix. Prefix VERY IMPORTANT: / MUST: when warranted.>

## Suggestions
- <non-blocking improvements>

## Nits
- <style, naming, tiny cleanups — prefix `nit:`>
```

Each item gets exactly one bullet — no item appears in more than one section. Use inline tags to mark domain when useful: `[a11y]`, `[perf]`, `[security]`, `[bff]`, `[middleware]`, `[follow-up]`. Severity drives the section; the tag adds the domain colour.

Use `[follow-up]` for cross-cutting work the author should track separately rather than fix in this PR; place it in `Suggestions`.

Drop empty sections. Don't pad. Do not modify files during the review — read-only.
