---
paths:
  - "app/**/*.tsx"
  - "app/globals.css"
---

# Styling (Tailwind CSS 4)

Tailwind CSS 4 is the styling system. A custom color/theme layer is defined in `app/globals.css`; components compose Tailwind utility classes directly.

Reference: `app/globals.css`, `app/components/ui/Button.tsx`, `app/components/Sidebar.tsx`, `app/layout.tsx`.

## Rules

- **No class-merge helper.** There is no `cn()` / `clsx()`. Compose classNames with **template literals + ternaries**:
  ```tsx
  className={`rounded-full text-sm font-medium transition-colors ${sizeStyles[size]} ${
    disabled ? styles.disabled : styles.base
  } ${fullWidth ? "w-full" : ""} ${className}`}
  ```
- **Variant/size → class via typed `Record`** (defined outside the component), then index into it:
  ```tsx
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5",
    md: "px-4 py-2",
    lg: "px-5 py-2.5",
  };
  ```
- **Custom design tokens** come from CSS variables in `app/globals.css`, exposed to Tailwind via `@theme inline`. Use the semantic token classes, not raw hexes or generic grays:
  - `bg-accent-primary`, `hover:bg-accent-hover`, `text-text-primary`, `text-text-secondary`, `border-border`, `bg-bg-secondary`, status colors (`--color-status-success/error/warning`).
  ```css
  @theme inline {
    --color-accent-primary: #1f4496;
    --color-accent-hover: #173574;
    --color-text-primary: #171717;
    --color-text-secondary: #737373;
    --color-border: #e5e5e5;
  }
  ```
- **`globals.css` is for what Tailwind can't express**: CSS variables/theme, base resets, and reusable keyframes/animations.
- **Component-scoped animations** use `<style jsx global>` blocks inside the component (e.g. `ComingSoon.tsx` steam keyframes) — only when the animation is local to that component.
- **Inline `style={{ ... }}`** only for genuinely dynamic values (computed pixel offset, runtime color from data).
- **Fonts** are loaded via `next/font` in `app/layout.tsx` as CSS variables (`--font-sans` Inter, `--font-mono` JetBrains Mono) and applied on `<body>`.
- Accept a `className` prop on reusable components and append it last so callers can extend styles.

## Splitting long className logic

When conditional class logic gets dense (e.g. nested active/hover states in `Sidebar.tsx`), keep it in a `Record` or a small local helper rather than deeply nested inline ternaries, to stay readable and within complexity/depth limits.
