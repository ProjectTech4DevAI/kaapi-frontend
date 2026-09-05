---
description: Pull the next `ready-for-agent` issue, branch off main, implement it, and open a PR.
argument-hint: "[issue number | empty to auto-pick]"
---

You are picking up a labelled GitHub issue in this Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS 4 frontend and taking it all the way to an open pull request.

Argument from the user: `$ARGUMENTS`

Repo: `ProjectTech4DevAI/kaapi-frontend`.

## Guardrails

- You push a **branch** and open a **PR**. Never push to `main`, never merge, never `--force`, never touch `.releaserc` or the workflows in `.github/`.
- `cd-dev.yml` / `deploy-staging.yml` deploy from this repo — a bad merge to `main` ships. Branch + PR only, always.
- One issue per run. Don't batch several issues into one branch.
- If the issue is ambiguous, under-specified, or would touch auth / middleware gating / the BFF contract, **stop and ask** rather than guessing. Say what's unclear.

## 1. Select the issue

If `$ARGUMENTS` is an issue number, use it directly:

```bash
gh issue view <n>
```

Otherwise list the queue:

```bash
gh issue list --label ready-for-agent --state open --json number,title,labels,body
```

No open issues carry the label → say so plainly and stop. Don't invent work.

Several are queued → pick one by this priority order:

1. **Critical bugfixes** — broken behaviour users hit today
2. **Development infrastructure** — types, lint, CI, test scaffolding, dev scripts (these unblock everything after them)
3. **Tracer bullets for new features** — the thinnest end-to-end slice through every layer (route → BFF handler → client fetch → component), so the shape is validated before the feature is built out
4. **Polish and quick wins**
5. **Refactors**

Say which issue you picked and why it outranked the others.

## 2. Branch

```bash
git status              # never clobber uncommitted work — stash -u or stop
git checkout main && git pull
git checkout -b <type>/<kebab-slug>
```

Branch naming follows this repo's existing convention (`git branch -r` to confirm): `<type>/<kebab-slug>`, where type maps from the issue's label:

| Issue label     | Branch prefix  | Commit type |
| --------------- | -------------- | ----------- |
| `bug`           | `fix/`         | `fix:`      |
| `enhancement`   | `enhancement/` | `feat:`     |
| `documentation` | `docs/`        | `docs:`     |
| _none / other_  | `feat/`        | `feat:`     |

Slug from the issue title, not the issue number: `fix/eval-card-mobile-overflow`, not `fix/issue-42`.

## 3. Understand before you edit

- Read `CLAUDE.md` for architecture, then `Grep`/`Glob` for the actual code paths involved. Read whole files at change sites, not just the lines you think you need.
- **Grep for existing solutions first.** `app/components/`, `app/hooks/`, `app/lib/utils/`, `app/lib/constants.ts`, `app/components/icons/`. Reusing `Button`/`Modal`/`useToast`/`clientFetch` beats authoring a new one — re-implementing what already lives two files over is the most common failure here.
- Trace the full flow before choosing a fix. A bug report names a symptom; fix the root cause where every caller routes through, not just the path the issue mentions.
- Smallest diff that actually solves it. No speculative abstractions, no scaffolding "for later", no new dependency for what a few lines cover.

Conventions that apply to whatever you write (`/pr-review` has the full list):

- Import alias `@/...`, never relative `../../` chains
- `"use client"` only where state / effects / handlers / browser APIs demand it
- Design-system colour tokens (`text-text-primary`, `bg-accent-primary`), not raw `text-gray-500` or hex
- No `any`; no file over 500 LOC
- BFF handlers use `apiClient(...)`; browser calls use `clientFetch(...)`
- Loading, error, and empty states all handled

## 4. Verify

```bash
npm run lint
npm run build
```

Both must pass before you commit. If the change is user-visible, run `npm run dev` and exercise the golden path **and** a failure path — report what you actually saw. Never tick a checklist box for a step you didn't run.

## 5. Commit

`semantic-release` reads commit messages (`.releaserc`: `feat` → minor, `fix`/`chore`/`docs`/`refactor` → patch), so **conventional commits are required** — a non-conforming subject silently breaks versioning.

```bash
git diff                       # review before staging
git add <specific files>       # never `git add .`
git commit -m "fix: correct eval card overflow on mobile"
```

`.husky/pre-commit` runs `lint-staged`, which reformats staged files — if it rewrites anything, re-check `git diff HEAD` before pushing.

Scan the diff for anything that shouldn't ship: `.env*`, tokens, keys, `console.log`, commented-out code, stray lockfiles (`package-lock.json` is the only valid one here).

## 6. Push and open the PR

```bash
git push -u origin <branch>
```

Fill `.github/PULL_REQUEST_TEMPLATE.md` — use its headings verbatim, don't invent your own:

```bash
gh pr create --title "<conventional-commit-style summary of the change>" --body "$(cat <<'EOF'
## Issue

Closes #<number>

## Summary

<What problem this solves and why it matters — the motivation, not a restatement of the diff. 2-4 sentences.>

<Then 1-3 bullets: what changed and where, as `path/to/file.tsx` references.>

## Checklist

Before submitting a pull request, please ensure that you mark these task.

- [ ] Ran `npm run dev` and `npm run build` in the repository root and test.
- [ ] If you've fixed a bug or added code that is tested

## Notes

<Anything the reviewer needs: trade-offs taken, follow-ups deliberately deferred, areas worth a closer look. "None." if genuinely nothing.>
EOF
)"
```

`Closes #<number>` is what makes GitHub auto-close the issue on merge — don't drop it or reword it.

Tick a checklist box only if you ran that command and it passed. If you couldn't run `npm run dev` (no browser, headless), leave it unchecked and say so in `## Notes`.

## 7. Report back

State: the issue picked, the branch, files touched, `lint`/`build` results, the PR URL, and anything you deliberately left out of scope.
