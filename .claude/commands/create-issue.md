---
description: Draft and create a GitHub issue following the kaapi issue patterns (feature request / enhancement).
argument-hint: [short description of the feature or problem]
allowed-tools: Bash(gh issue:*), Bash(gh repo view:*), Read, Grep, Glob
---

Create a GitHub issue for this repo from: $ARGUMENTS

## Procedure

1. If the description is thin, look at the relevant code (`Read`/`Grep`) to ground the issue in current behaviour — name the actual components, validators, pages, or files involved.
2. Pick the template that fits:
   - **Feature request** — something new is needed.
   - **Enhancement / behaviour change** — existing behaviour is lacking and should be improved.
3. Draft the body using the matching template below. Concrete and specific: name real files, components, and user-facing behaviours. Solution bullets are actionable steps, not vague goals.
4. Show the draft title + body to the user and **wait for confirmation before creating** — issues are public.
5. On confirmation: `gh issue create --title "<title>" --body "<body>"`. Report the issue URL.

## Template A — Feature request

```markdown
**Is your feature request related to a problem?**
<1–3 sentences: the problem or need, why it matters, what it prevents or risks.>

**Describe the solution you'd like**

- <concrete step / change>
- <concrete step / change>
- <concrete step / change>
```

## Template B — Enhancement (existing behaviour lacking)

```markdown
**Describe the current behaviour?**
<What happens today, where (which page/component/flow), and why it falls short for users.>

**Describe the enhancement you'd like**
<What should change and where. End with a bullet list when the change enumerates concrete items:>

- <item>
- <item>
```

## Style

- Bold question headers exactly as in the templates.
- Plain, user-impact language in the problem section; implementation specifics belong in the solution bullets.
- Title format: `<Area>: <Imperative action>` — area names the feature surface, action starts with a verb (Add / Fix / Merge / Enhance). Examples from this repo:
  - `Guardrails UI: Add dropdowns and modals`
  - `Dataset View: Fix multi-line CSV rendering`
  - `Feature Branch: Merge latest changes`
  - `AI Assessment: Enhance usability features`
