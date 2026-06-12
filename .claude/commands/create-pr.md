---
description: Draft and open a PR for the current branch following the kaapi PR pattern (Issue link + Summary).
argument-hint: [issue number or URL]
allowed-tools: Bash(git:*), Bash(gh pr:*), Bash(gh issue view:*), Read, Grep, Glob
---

Open a PR for the current branch. Issue reference from the user: $ARGUMENTS

## Gather context

1. `git log main..HEAD --oneline` + `git diff main...HEAD --stat` — understand the full change set.
2. Read the diff at non-trivial change sites to describe changes accurately — summarize what the code does now, not commit messages.
3. Resolve the issue link:
   - Argument given → normalize to full URL (`https://github.com/<owner>/<repo>/issues/<n>`).
   - No argument → check branch name / commits for an issue number, else `gh issue list` and ask the user which one. The Issue line is required — don't skip it.
4. Branch check:
   - On `main` → create a branch first. Naming: `feat/<kebab-scope>` (e.g. `feat/evals-category`, `feat/collection-document-preview`, `feat/assessment-pipeline-l1`). Use `fix/<kebab-scope>` for pure bugfixes.
   - Confirm the branch is pushed (`git push -u origin HEAD` if needed).

## PR body format

```markdown
### Issue: https://github.com/<owner>/<repo>/issues/<n>

### Summary

- **<Area>:** <what changed, in user/outcome terms — what it fixes or enables, then notable specifics.>
- **<Area>:** <...>
- Minor cleanup: <small refactors, moved files, barrel exports — grouped into one trailing bullet.>
```

Rules for the Summary:

- Bullets grouped by area/theme (**bold lead-in**), not one bullet per commit.
- Describe outcomes first ("Fixed CSV parsing: moved it into one shared helper that handles multi-line and quoted values"), implementation details second.
- Cleanups/refactors collapse into a single "Minor cleanup:" bullet at the end.
- For a large user-facing feature (new page/major flow), expand with a `## What users can do` subsection listing capabilities as nested bullets (see the Dashboard PR pattern).
- No filler ("This PR aims to…"). Every bullet states a real change.

## Create

5. Title format: `<Area>: <Change summary>` — short, no trailing period. Examples from this repo:
   - `Evals: Added ID Column & UI Updates`
   - `Evaluation: Category-wise analytics for Evals`
   - `Sync: dev with main`
     Cross-check `git log main --oneline -10` for the prevailing style before finalizing.
6. Show the draft title + body to the user and **wait for confirmation before creating**.
7. `gh pr create --title "<title>" --body "<body>"`. Report the PR URL.
