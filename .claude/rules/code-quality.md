---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Code quality (and how it's enforced)

Quality rules are **mechanically enforced** by ESLint + Prettier + Husky — not just guidance. The build fails on `error`-level violations. Write to pass them the first time.

Reference: `eslint.config.mjs`, `tsconfig.json`, `.prettierrc`, `package.json` (husky / lint-staged).

## The rules → the enforcer

| Rule (what to do)                               | ESLint rule                                                                            | Level     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- | --------- |
| **File ≤ 500 LOC** (excl. blank/comment lines)  | `max-lines` `{ max: 500, skipBlankLines, skipComments }`                               | **error** |
| Function complexity ≤ 10                        | `complexity`                                                                           | warn      |
| Nesting depth ≤ 4                               | `max-depth`                                                                            | warn      |
| ≤ 20 statements / function                      | `max-statements`                                                                       | warn      |
| ≤ 4 params / function                           | `max-params`                                                                           | warn      |
| No duplicate logic (DRY)                        | `sonarjs/no-identical-functions`, `no-identical-expressions`, `no-duplicated-branches` | warn      |
| No repeated string literals (≥5×)               | `sonarjs/no-duplicate-string` `{ threshold: 5 }`                                       | warn      |
| `const`/`let` only, no `var`                    | `no-var`, `prefer-const`                                                               | error     |
| No duplicate imports                            | `no-duplicate-imports`                                                                 | error     |
| Unused vars (prefix `_` to allow)               | `@typescript-eslint/no-unused-vars`                                                    | error     |
| Escape entities in JSX                          | `react/no-unescaped-entities`                                                          | error     |
| Only `console.warn` / `console.error`           | `no-console` `{ allow: ["warn","error"] }`                                             | warn      |
| Hooks at top level, unconditional, stable order | `react-hooks/rules-of-hooks` (via next preset)                                         | **error** |

Note: `react-hooks/exhaustive-deps` and `react-hooks/set-state-in-effect` are intentionally **off** — don't add deps comments to satisfy a rule that isn't running.

## SRP — Single Responsibility

Each component / hook / function / module does one thing. If a component fetches data **and** holds business logic **and** renders → split: data fetching → a hook (`app/hooks/`), business logic → a util (`app/lib/utils/`), keep the component presentational. The `complexity`/`max-depth`/`max-statements` warnings are the signal you've combined too much.

## No inline SVGs — icons live in the icons folder

Never inline an `<svg>` in feature code, pages, or components. Every icon is a hand-authored React component under `app/components/icons/` (in the matching domain subfolder: `common/`, `document/`, `evaluations/`, `guardrails/`, `prompt-editor/`, `sidebar/`), exported from `app/components/icons/index.tsx`, and imported from that barrel:

```tsx
import { CopyIcon, CheckIcon } from "@/app/components/icons";
```

Before authoring a new icon, check the existing ones — `common/` already covers arrows, check, chevron, copy, download, eye, gear, error-circle, etc. New icon → new `XxxIcon.tsx` in the right subfolder + barrel export, matching the existing shape:

```tsx
interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function CopyIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      {/* paths */}
    </svg>
  );
}
```

`stroke="currentColor"` so the icon inherits text color from Tailwind classes.

## DRY — Don't Repeat Yourself

Search before writing. Same pattern in 2+ places → extract to a shared helper/hook/component in `app/lib/` or `app/components/`. Repeated strings → constants in `app/lib/constants.ts`.

## Splitting a file approaching 500 LOC

Pick the natural seam:

- Component too big → extract sub-components into sibling files; move state logic into a hook.
- Hook too big → move pure/network logic into `app/lib/` fetchers/utils; keep the hook as orchestration (pattern: `useConfigs` ↔ `configFetchers`).
- Types crowding a file → move shapes into `app/lib/types/<domain>.ts`.

## Comments

- JSDoc block on non-trivial files and exported functions: purpose, usage, and non-obvious cost/behaviour notes (see `app/lib/configFetchers.ts`, `app/hooks/useInfiniteScroll.ts`).
- Sparse inline comments only for non-obvious logic / workarounds. Target ~5–10% density — explain **why**, not **what**.

## Formatting (Prettier — `.prettierrc`)

2-space indent · double quotes · semicolons · trailing commas (`all`) · `printWidth: 80` · `arrowParens: always` · LF line endings. Run `npm run format`. Husky + lint-staged run prettier + `eslint --fix` on staged `*.{js,ts,jsx,tsx,json,md,css}` at commit — match this up front to avoid churn.

## TypeScript & imports

- Strict mode is **off** in `tsconfig.json` (`"strict": false`), path alias `@/* → ./*`. Still write fully-typed code (explicit prop/return interfaces) — don't lean on the relaxed compiler to skip types.
- Imports: always the `@/` alias (e.g. `@/app/lib/apiClient`), never deep relative paths.

## Before "done"

```bash
npm run lint && npm run build
```

Both must pass. Fix all errors and address warnings introduced by your change.
