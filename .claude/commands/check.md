---
description: Run the repo's verification gate (lint + production build) and fix everything it flags.
allowed-tools: Bash(npm run lint:*), Bash(npm run build:*), Bash(npm run format:*), Read, Edit, Write, Grep, Glob
---

Run the kaapi-frontend verification gate and drive it to green:

1. `npm run lint` — fix **all** errors (max-lines > 500, no-var, unused vars, rules-of-hooks, duplicate imports, unescaped entities). Address warnings introduced by recent changes (complexity, max-depth, max-statements, duplicate strings); pre-existing warnings elsewhere can stay.
2. `npm run build` — production build must succeed. Fix type errors and build failures.
3. Re-run both after fixes until both pass cleanly.

When splitting a file that breached 500 LOC, follow the seams in `.claude/rules/code-quality.md`: sub-components → sibling files, state logic → `app/hooks/`, pure/network logic → `app/lib/`, types → `app/lib/types/<domain>.ts`.

Report the final status of both commands, and list any pre-existing warnings you intentionally left untouched.
