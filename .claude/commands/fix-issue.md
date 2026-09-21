---
description: Fix an issue and open a PR
---

Fix issue #$1 in this repository.

## Steps

1. Read the issue: `gh issue view $1 --comments`.
   If screenshots are attached, analyse them carefully.
2. Find the relevant files. Use Glob and Grep, read before editing.
3. Create a branch off main: `git checkout -b agent/ui-fix-$1 main`
4. Implement the fix.
   - Any part of the app is in scope: UI, business logic, API routes,
     data fetching, auth. Every PR is reviewed by a human before merge,
     so fix what the issue actually asks for instead of narrowing it.
   - Follow the conventions in CLAUDE.md: reuse existing components,
     icons, hooks, types and utilities; use existing design tokens and
     utility classes, never hardcoded hex colours or pixel values.
   - Keep the change as small as the issue requires.
   - You cannot reach the backend or any network from this run. If the
     issue names an endpoint, payload or contract, implement it as the
     issue describes, mirror the shape of the existing code you are
     replacing, and list the assumption in the PR body under
     `## Assumptions` for the reviewer to confirm. Do not stop just
     because you cannot verify a backend contract.
5. Verify: `npm run lint` and `npm run build` must both pass.
   Fix anything you broke before continuing.
6. Commit and push:
   `git add -A && git commit -m "fix: <short description>"`
   `git push -u origin HEAD`
7. Open the PR:
   `gh pr create --base main --title "fix: <short description>" --body "..."`
   The body must contain `Closes #$1` and explain what changed and why.

## Non-interactive

This runs in GitHub Actions. Nobody will answer questions.

Missing context is not a reason to stop. Pick the most reasonable
reading of the issue, implement it, and record what you assumed in the
PR body — the reviewer corrects it there.

Only bail out when the issue does not describe an actionable change at
all (e.g. it contradicts itself, or the files it refers to do not
exist). In that case: comment on the issue explaining what's blocking
you, add the `agent-needs-human` label, and stop.

## Done means

A pushed branch AND an open PR. Editing files without opening a PR
is a failed run.
