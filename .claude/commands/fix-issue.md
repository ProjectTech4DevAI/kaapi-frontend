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
   - Use existing design tokens and utility classes, never hardcoded
     hex colours or pixel values.
   - Touch only UI/styling files. Do not change business logic,
     API calls, or auth.
   - Keep the change as small as the issue requires.
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

If the issue is too ambiguous to fix safely, do NOT change code.
Instead: comment on the issue explaining what's unclear, add the
`agent-needs-human` label, and stop.

## Done means

A pushed branch AND an open PR. Editing files without opening a PR
is a failed run.
