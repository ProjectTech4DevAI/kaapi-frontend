---
paths:
  - "app/components/**"
  - "app/(main)/**/*.tsx"
  - "app/(auth)/**/*.tsx"
---

# Components

App components live in `app/components/` (shared UI primitives in `app/components/ui/`, icons in `app/components/icons/`). Route-level pages live under `app/(auth)/` and `app/(main)/`.

## Skeleton

```tsx
"use client"; // only if the component uses state, effects, refs, or browser APIs

import { ReactNode, useState } from "react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  hidden?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  children,
  actions,
  hidden = false,
}: PageHeaderProps) {
  // ...
}
```

Reference: `app/components/PageHeader.tsx`, `app/components/Sidebar.tsx`, `app/components/ui/Button.tsx`.

## Rules

- **File name**: PascalCase, `.tsx` (e.g. `PageHeader.tsx`).
- **Export**: `export default function ComponentName(...)`. Function declaration, not `const X = () => {}`.
- **`"use client"`**: top of file, only when the component needs client-side React (state/effects/refs/handlers/browser APIs). Pure presentational server components omit it.
- **Props typing**: an `interface ComponentNameProps` immediately above the component. Optional props use `?`; defaults applied in the destructure (`hidden = false`).
- **Children/slots**: typed as `ReactNode` (e.g. `children`, `actions`).
- **HTML passthrough** (for primitives): extend the native attributes, e.g. `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>`.
- **Imports**: use the `@/` alias for cross-folder imports; React imports first.

## Variant styling pattern (UI primitives)

Map variant/size to class strings via a typed `Record`, then compose with a template literal. No `cn()`/`clsx()` (see the styling rule).

```tsx
type ButtonVariant = "primary" | "outline" | "ghost";

const variantStyles: Record<ButtonVariant, { base: string; disabled: string }> =
  {
    primary: {
      base: "bg-accent-primary text-white hover:bg-accent-hover",
      disabled: "bg-neutral-200 text-text-secondary cursor-not-allowed",
    },
    outline: {
      base: "bg-white text-text-primary border border-border hover:bg-neutral-50",
      disabled: "border-border cursor-not-allowed opacity-50",
    },
    ghost: {
      base: "bg-transparent text-text-secondary hover:bg-neutral-100",
      disabled: "opacity-50",
    },
  };
```

## Reuse before creating

Check `app/components/ui/` for primitives (`Button`, `Modal`, `Field`, `MultiSelect`, `Select`, `RadioGroup`, `Toast`, `Loader`, `InfoTooltip`, `CodeBlock`, `ErrorModal`, `Tag`, `TabNavigation`, ...), `app/components/` for higher-level shared pieces (`PageHeader`, `Sidebar`, `GatePopover`, `ConfigCard`, and the `*Skeleton` loaders), and `app/components/icons/` first. Prefer composing existing primitives. New icons are hand-authored React components in `app/components/icons/` (domain subfolders, exported from its `index.tsx`) — never inline an SVG in feature code.

## Splitting

If a component file nears 500 LOC, extract sub-components into sibling files, move logic into a hook (`app/hooks/`), and pull types into `app/lib/types/`. See the code-quality rule.
