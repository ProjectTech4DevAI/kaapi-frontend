# Assessment Config UI v2 — Goal & Locked Design

**Status:** Design locked, not yet implemented.
**Branch:** `feat/assessment-config-ui-v2` (off `chore/assessment-contract-update`).
**Scope:** Overhaul of the Config screens in the Assessment feature. The top-level flow (upload dataset → set up config → experiment → run) stays as is; the Dataset step stays simple.

---

## 1. Product principle (the "why")

> **The UI should model the user's workflow — "I have a dataset, I write grading instructions" — not the system's architecture.**

NGO users are not AI engineers. Abstract away system prompts, response formats, and input schemas. All the user should know is: _write a prompt to an LLM, get output._ The current config flow mirrors backend internals (Configuration → Input Schema → Pre-filter → Assessment) and forces users to author a column schema by hand before they've written a single word of their actual grading logic.

This principle is reusable for other Kaapi surfaces (evals in Glific UI, guardrails config).

---

## 2. Current state (what we're replacing)

The "4 tabs" are actually a 4-step `Stepper` inside [ConfigPanel.tsx](../app/components/assessment/ConfigPanel.tsx) (all steps stay mounted, hidden via CSS):

1. **Configuration** — [ConfigSelectStep.tsx](../app/components/assessment/ConfigSelectStep.tsx): pick an existing config/version or start new.
2. **Input Schema** — [ColumnMapperStep.tsx](../app/components/assessment/ColumnMapperStep.tsx): user hand-types field names + type (`text | image | pdf`) in a table. **This is the step users don't understand — it's backend mimicry.**
3. **Pre-filter (opt.)** — [PrefilterStep.tsx](../app/components/assessment/PrefilterStep.tsx): Topic Relevance + Duplicate Detection toggle cards with column chips and a rubric textarea. (Note: column-chip selections are _not_ persisted in the blob today — only the prompt is.)
4. **Assessment** — [PromptAndConfigStep.tsx](../app/components/assessment/PromptAndConfigStep.tsx): system prompt editor (`@`-mentions disabled), response format behind a modal ([OutputSchemaModal.tsx](../app/components/assessment/output-schema/OutputSchemaModal.tsx)), model config in a `<details>` block.

Existing assets we will **reuse**:

- The **visual + JSON response-format editor** (`SchemaProperty[]` tree in [dataset.ts](../app/lib/types/assessment/dataset.ts), editor in [OutputSchemaEditorInner.tsx](../app/components/assessment/output-schema/OutputSchemaEditorInner.tsx), conversions in [outputSchema.ts](../app/lib/utils/outputSchema.ts)) — it's good; the problem is that it's disjointed from the editor (modal), not its internals.
- The `@`-mention machinery: [usePromptPlaceholderEditor.ts](../app/hooks/usePromptPlaceholderEditor.ts) (textarea + caret-mirror dropdown, inserts `{column}`) and the more generic [useAtMention.ts](../app/lib/hooks/useAtMention.ts).
- Model param controls: [ConfigCreator.tsx](../app/components/assessment/prompt-config/ConfigCreator.tsx) + [ConfigParamControl.tsx](../app/components/assessment/prompt-config/ConfigParamControl.tsx).

Dead code to remove during this work: `ReviewStep.tsx`, `OutputSchemaStep.tsx`, `PostProcessingStep.tsx`, `results/ResultsHeader.tsx`, unused files under `app/components/assessment/review/`.

---

## 3. Backend contract the UI must produce

The config UI writes an `AssessmentConfigBlob` through the generic config endpoints with `tag: "ASSESSMENT"` (`POST /configs`, `POST /configs/{id}/versions`; read via `GET /configs/{id}/versions/{n}` — the blob is absent from `GET /configs/{id}`).

```
AssessmentConfigBlob
├── pre_filters?            (AssessmentPreFilters)
│   ├── topic_relevance?    { provider, params: {model, instructions*, …LLM params}, stop_on_fail (default true) }
│   └── duplicate_detection? { provider, params, stop_on_fail (default false), knowledge_base_id? }
└── assessment              (AssessmentCompletionConfig)
    ├── provider            ("openai" | "google" | "anthropic")
    ├── type: "text"
    └── params
        ├── model, instructions (system prompt), temperature, top_p, effort, …
        ├── input_schema        { [column]: {type: "text"|"image"|"pdf", format?: "url"} }  — mandatory, ≥1
        └── json_output_schema? (object-typed JSON schema, or omit for free text)
```

Hard facts that constrain the design (verified in `kaapi-backend`):

1. **Input types are exactly `text | image | pdf`.** No int/number/bool/date. Every dataset cell is a string; nothing is numerically validated. Attachments must be `format: "url"` (base64 is rejected for batch) and cells must start with `http(s)://`. One cell may hold multiple URLs (comma/newline separated); Google Drive share links are auto-rewritten server-side.
2. **Prompt assembly is a naive `str.replace` of `{column}` tokens** — single braces, no escaping, no expressions. Only **text**-typed columns are substituted; a `{col}` pointing at an image/pdf column stays in the prompt as literal text (attachments are appended to the user message automatically). Misspelled placeholders are silently left as literals.
3. **System vs user prompt:** `params.instructions` → provider system prompt. The per-row user message = rendered `input.query` template + attachment parts. **The `query` template currently lives on the _run request_ (`BatchInput.query`), not in the config blob** — see Backend changes §7.
4. **Pre-filter output is fixed and injected server-side:** `{verdict: boolean, reasoning: string}`. Not editable, not a score. Unparseable output fails _open_ (`verdict=true`). `stop_on_fail=true` gates the row out of assessment; `false` just records the verdict.
5. **Pre-filter stages have no user template.** The user message for a pre-filter is _all_ text columns concatenated + all attachments; the criteria (`params.instructions`) get a hardcoded "You are a pre-filter gate…" suffix appended. `{column}` tokens in pre-filter instructions are **not substituted** today — see Backend changes §7.
6. **Version creation is a recursive deep merge, not a replace.** Omitting an `input_schema` column does NOT delete it; setting it `null` fails validation. **There is currently no way to remove a column from a saved config** — see Backend changes §7.
7. **No config-time validation** of `json_output_schema` (backend accepts anything, then fails asynchronously at provider-submit time) and **no dataset-vs-config validation endpoint** (only exact-set-equality row validation at submit time: missing AND extra columns both 422). The frontend must do both checks itself.
8. **OpenAI structured output runs with `strict: true`:** every property must be `required`, no `anyOf`/`oneOf`/`$defs`. Gemini's subset is narrower again. The schema builder must stay inside the intersection.
9. Reference spec with a worked JSON example: `kaapi-backend/backend/app/api/docs/config/create.md`.

---

## 4. Locked design

### 4.1 Information architecture

The config flow collapses from 4 steps to **3**:

```
1. Choose config          (pick existing / start new — largely unchanged)
2. Pre-filter (optional)  (single editor + model panel)
3. Assessment             (single editor + model panel)
       └─ Review & save   (fields check, assembled preview, name/version — the save action of step 3)
```

- **The "Input Schema" step is deleted as a user-facing form.** The input schema is _derived_ from the `@`-references the user writes in their prompts (§4.3). Users never author a column table again.
- **"Review & save"** is not a full fourth step — it's the save surface at the end of Assessment (modal or slide-over) that shows everything derived from the prompts before locking in (§4.6).
- Steps stay mounted-but-hidden (current `ConfigPanel` pattern) so in-flight edits survive navigation.
- Pre-filter shows **Topic Relevance only** for now. Duplicate Detection stays supported in the blob types but is dropped from v2 UI (per brief: "focus only on topic relevance for now").

### 4.2 Terminology (user-facing language)

| Old (backend-speak)               | New (user-speak)                                                | Maps to                                                    |
| --------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| System prompt                     | **Instructions**                                                | `assessment.params.instructions`                           |
| User input / prompt template      | **Submission**                                                  | run-time `input.query` template (persisted in config — §7) |
| Response format / output schema   | **Response format** (embedded in editor)                        | `assessment.params.json_output_schema`                     |
| Input schema                      | _(invisible — derived)_                                         | `assessment.params.input_schema`                           |
| Pre-filter topic relevance prompt | **Relevance check**                                             | `pre_filters.topic_relevance.params.instructions`          |
| `stop_on_fail`                    | "Skip assessment for rejected submissions" (toggle, default on) | `topic_relevance.stop_on_fail`                             |

### 4.3 The editor (both sections share it)

**Layout:** editor canvas on the left, panel column on the right. The right column stacks, top to bottom: **Model** card (provider, model, params), **Fields** card (§4.4), **Preview** action (§4.7).

**The Assessment editor canvas is one visually continuous document with three stacked zones**, in final assembly order:

```
┌─────────────────────────────────────────────┐
│ INSTRUCTIONS                     (static)   │  ← no @ allowed; role, rubric,
│ "You are a helpful assistant assessing…"    │    golden answers, guidance
├─────────────────────────────────────────────┤
│ SUBMISSION                    (@ enabled)   │  ← what gets graded, per row
│ "Grade the answers in @AnswerSheet          │
│  submitted by @StudentName …"               │
├─────────────────────────────────────────────┤
│ RESPONSE FORMAT              (structured)   │  ← inline schema block, §4.5
│  answer1_marks   Whole number    [required] │
│  answer2_marks   Whole number    [required] │
│  feedback        Text            [required] │
│  + Add field                                │
└─────────────────────────────────────────────┘
```

One scroll, one mental flow: _who you are → what you're grading → what I want back._ Zone headers are quiet labels, not tabs. This mirrors the concatenated final prompt, so the preview (§4.7) is just this document rendered with a sample row.

**`@`-reference mechanics:**

- Typing `@` in the Submission zone opens a dropdown of available columns (keyboard navigable — reuse/extend `usePromptPlaceholderEditor`).
- **Column source:** an optional **reference dataset picker** at the top of the config editor ("Which dataset is this config for? Used for column names and preview — the config isn't tied to it."). When a dataset is selected, its headers (via the existing preview endpoint, `limit_rows=1`) feed the mention list and a sample row feeds the preview. Without one, `@` offers "create field…" free-entry. This closes the current gap where `/assessment/config` has no column source at all.
- **Serialization:** a mention is stored as `{ColumnName}` in the template string — exactly what the backend substitutes. What the user sees is a highlighted `@ColumnName` token.
- **Editor technology — locked:** keep the **textarea + syntax-highlight overlay** approach (extend the existing caret-mirror technique to also colorize `{tokens}` in the mirror layer). No contenteditable, no tiptap/lexical/CodeMirror dependency. Rationale: plain-string source of truth (trivially serializable to the backend template), zero new deps, builds on code we have, respects the repo's hand-rolled-kit convention. The trade-off — tokens aren't click-targets inside the text — is deliberately absorbed by the Fields card (§4.4), which is where token metadata is edited.
- **Attachment columns behave differently by design:** inserting an `@` reference to an image/pdf column does not put a `{token}` in the text (the backend wouldn't substitute it). Instead it registers the column as an attachment field and shows a non-text **"attached" chip** rendered at the insertion line (overlay-drawn), with copy like `📎 AnswerSheet (PDF, attached automatically)`. The Fields card lists it under "Attached files".
- Unknown/misspelled `{tokens}` typed by hand are flagged in the overlay (amber underline) and surfaced in Review & save.

**The Instructions zone has `@` disabled** (static by definition). If the user types `@` there, show a gentle hint: "Column references go in the Submission section below."

### 4.4 Type capture — the "don't distract the writer" answer

The brief's open question: capture field types in place (interrupts flow) vs. a separate tab at the end (out of sight, out of mind). **Locked: both halves of a middle path, neither of the extremes.**

1. **Zero interruption at write time.** Choosing a column from the `@` dropdown inserts it immediately with type defaulting to **Text**. No popover, no modal, nothing between the user and their sentence.
2. **A passive Fields card** in the right panel accumulates every referenced column live:

   ```
   FIELDS  (from your prompt)
   ─ In the submission ─
   @StudentName    [Text ▾]
   @AnswerSheet    [PDF (link) ▾]   ⚠ check type
   ─ Attached files ─
   📎 ModelAnswers  PDF
   ```

   Type is a single small select per row: **Text / Image (link) / PDF (link)** (the only types the backend supports — the brief's "int?" is not a backend concept; every CSV cell is a string). A lightweight heuristic pre-fills it: sample-row cell starts with `http(s)://` + extension → suggest Image/PDF and mark "check type"; otherwise Text. Users who never look at the card still produce a valid config (everything defaults to Text).

3. **A hard gate only at Review & save** (§4.6): any field with an unresolved "check type" warning, or any attachment column whose sample value isn't a URL, must be confirmed before saving. This is the one moment type-correctness is forced — after the writing is done, exactly as the brief leans.

`assessment.params.input_schema` is derived mechanically: every referenced text column → `{type:"text"}`, every attachment → `{type:"image"|"pdf", format:"url"}`. `ColumnMapperStep` and its hand-authored table die.

### 4.5 Response format embedded in the editor — the MAIN issue

**Locked: the response format is an inline block pinned as the third zone of the editor document** (§4.3) — not a modal, not a tab.

- It **reuses the existing `SchemaProperty[]` visual editor** (rows: name, friendly type, required) rendered inline, restyled to feel like "the end of my prompt" rather than a form: rows look like the list a teacher would write ("answer1 marks — whole number"), with a quiet **"+ Add field"** ghost row.
- **Quick-add flow:** click "+ Add field" (or press Enter on the last row) → a new row with the name input focused; type name, Tab, pick type, Enter → next row. Authoring `answer1 marks / answer2 marks / … / answer n marks` is a rhythm, not form-filling. Field names are slugified for the schema (`answer1 marks` → `answer1_marks`) with the display name preserved.
- Friendly type labels stay: Text / Number / Whole number / Yes-No / Choice / Group (mapping to string/number/integer/boolean/enum/object as today).
- The **JSON toggle** survives as an affordance on the block (corner toggle) for power users — same two modes as today, now in place instead of in a modal.
- **Free-form escape hatch:** the block has an off state — "No structured format (free text response)" — which omits `json_output_schema`.
- **Strict-mode guardrails (new):** all fields are **required by default** and the per-field "optional" toggle is removed from v2 (OpenAI `strict:true` rejects optional properties; the backend does not repair this). Root is always an object; empty schema (zero fields) is treated as "off". No `anyOf`/`$ref` authorable. This keeps every authored schema inside the OpenAI-strict ∩ Gemini subset. The JSON view validates against the same rules and refuses to save outside them.

Rejected alternatives, for the record:

- _Natural-language schema detection_ ("parse `answer1 marks - int` lines with an LLM"): magical but fragile, and un-inspectable failures land on exactly the non-technical users we're designing for. Revisit as an assist ("Suggest fields from my prompt") later, not as the primary mechanism.
- _Slash-command inserted schema blocks anywhere in the text_: schema position in the text is meaningless to the backend (it's structured output, not prompt text); floating blocks would be a lie about how the system works. Pinned-at-end matches reality.
- _Keep the modal_: the disjointedness is the whole complaint.

### 4.6 Review & save

Triggered by the primary "Save config" action at the end of Assessment. One surface (slide-over panel) showing, top to bottom:

1. **Fields** — the derived input schema as a read-back ("Your dataset needs these columns: …"), with the type selects editable one last time; unresolved warnings block save. If a reference dataset is selected, show a live **compatibility check** (client-side header diff: missing columns / extra columns — mirroring the backend's exact-set-equality rule) so the user learns at config time what the backend would only tell them at run time.
2. **Assembled prompt preview** — Instructions → Submission (sample row substituted when a reference dataset exists, tokens highlighted otherwise) → Response format (rendered as the field list). Honest footnote: attachments are delivered as files alongside the prompt; the response format is enforced as structured output.
3. **Pre-filter summary** — criteria + model + the skip toggle, or "No pre-filter".
4. **Model summary** — provider/model/params for the assessment call.
5. **Name / save-as** — existing new-config vs new-version flow from `ConfigCreator`'s save modal, kept.

### 4.7 Pre-filter section (Topic Relevance)

Same chassis as Assessment — editor left, model panel right — minus what doesn't apply:

- **One editor zone: "Relevance check."** Placeholder copy: _"Describe what makes a submission relevant. Every submission's content is shared with the model automatically."_
- **Fixed-output notice instead of a response-format zone:** a static strip — _"Output is fixed: ✓ Accepted / ✗ Rejected, with a reason."_ (maps to the injected `{verdict, reasoning}` schema; the UI shows Accepted/Rejected language, the API speaks booleans). No schema editor here, ever.
- **"Skip assessment for rejected submissions"** toggle → `stop_on_fail` (default on).
- Model panel identical to Assessment's (pre-filters carry their own provider+params). Default model comes from the blob defaults, surfaced honestly ("Recommended default"), with the quirk that the default model forces `effort=high` and drops temperature — the panel hides the temperature slider in that case rather than showing a dead control.
- **`@`-references in the pre-filter editor are contingent on Backend change B2 (§7).** If B2 lands, the editor behaves exactly like the Submission zone. Until then, `@` is disabled here and the notice explains that all columns are shared automatically (which is the true current behavior). We will not ship an editor that renders `@Column` chips the backend treats as literal text.
- Duplicate Detection: not rendered in v2 (see §4.1). Existing configs that contain it round-trip untouched.

### 4.8 Model configuration panel

- Reuse `ConfigCreator` / `ConfigParamControl` visuals: provider select, model select, params (sliders/enums) behind a collapsed "Advanced" section. Defaults visible, params reset on model change (current behavior, correct).
- **Migrate the model catalog from the hardcoded [assessmentModels.ts](../app/lib/data/assessmentModels.ts) to the backend-driven `GET /models/grouped`** already used by the rest of Kaapi ([useModelSchemas.ts](../app/hooks/useModelSchemas.ts) / [modelSchemaStore.ts](../app/lib/store/modelSchemaStore.ts)). The backend validates `params.model` against its `model_config` table at save time — a hardcoded list will drift and 400. Also delete the verbatim helper copies in `assessmentFetcher.ts:43-72`.
- Suppress dead controls contextually: temperature hidden for reasoning-model selections where the backend drops it anyway.

---

## 5. What gets deleted / cleaned up

- `ColumnMapperStep.tsx` (input-schema table) — replaced by derived fields.
- `OutputSchemaModal` as the _entry point_ (the inner editor survives inline; the modal shell can remain for the JSON expand if useful).
- Dead files listed in §2.
- Duplicate `schemaToJsonSchema` in `assessment.ts` vs `toJsonSchema` in `outputSchema.ts` — keep one.
- Hardcoded model catalog + its duplicated helpers (§4.8).
- `!important` Button overrides in `Stepper.tsx` / step files — restyle properly while touching them.

---

## 6. Explicitly out of scope for v2

- The Experiment / Runs tabs (except the minimal change of reading the Submission template from the config instead of authoring it there).
- Duplicate Detection UI.
- Post-processing.
- Dataset step redesign (stays simple, per brief).
- Any LLM-assisted prompt/schema generation.
- Fixing the legacy run endpoints' backend bugs (tracked as risks, §8).

---

## 7. Required backend changes (blockers flagged, all small)

The design intentionally minimizes these, but three are load-bearing:

| #      | Change                                                                                                                                          | Why                                                                                                                                                                                                                            | Blocking?                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **B1** | Add `query_template: str \| None` to `AssessmentTextParams` (persisted in the blob; run submission copies it into `input.query` as the default) | The brief puts the **Submission** (user template with `@`-refs) in the _config_, but today `query` exists only on the run request, and `AssessmentTextParams` silently drops unknown params — the template cannot be persisted | **Yes** — without it the Submission zone can't be saved                        |
| **B2** | Substitute `{column}` placeholders in pre-filter instructions (or add a pre-filter query template)                                              | Brief wants `@`-refs in the pre-filter editor; today pre-filter instructions are never substituted and the user message is all-columns-concatenated                                                                            | No — §4.7 degrades gracefully (`@` disabled in pre-filter until this lands)    |
| **B3** | A replace (non-merge) mode for `POST /configs/{id}/versions` — e.g. `?merge=false` or honoring `null` to delete `input_schema` keys             | Deep-merge means **a column can never be removed from a config**; editing a config to drop a field silently resurrects it                                                                                                      | **Yes** for editing existing configs; new-config-only flows survive without it |
| B4     | (Nice-to-have) `GET /assessment/datasets/{id}/columns` lightweight endpoint                                                                     | Today the column list requires a preview call that downloads the file; fine at v2 scale, wasteful later                                                                                                                        | No                                                                             |
| B5     | (Nice-to-have) Shallow validation of `json_output_schema` at config save (object-typed, non-empty, strict-compatible)                           | Backend comment claims it exists; it doesn't. Client-side enforcement (§4.5) covers v2, but defense in depth                                                                                                                   | No                                                                             |

**Frontend-side compensations locked regardless:** always read the full blob (`GET /configs/{id}/versions/{n}`), mutate client-side, and send the **entire** blob on version create (never a partial); enforce schema strictness client-side; do the dataset-vs-config header diff client-side.

---

## 8. Risks & gotchas (verified in kaapi-backend, must be respected)

1. The assessment blob is hidden from OpenAPI (`SkipJsonSchema`) — frontend types in [configs.ts](../app/lib/types/configs.ts) are hand-maintained against `kaapi-backend/backend/app/models/config/assessment_blob.py`; keep them in lockstep.
2. Legacy `POST /assessment/runs` currently cannot resolve `ASSESSMENT`-tagged configs (parses the blob as `ConfigBlob`, no `completion` key → 400), and `GET /assessment/runs` reads columns dropped by migration 078. The run flow this config UI feeds is mid-refactor on the backend — **coordinate before wiring Experiment to the new configs.**
3. Pre-filter verdict parsing fails _open_ (unparseable → accepted). Worth a UI footnote in the pre-filter section eventually; do not promise a hard gate.
4. `PATCH /configs/{id}` can only rename/re-describe; all blob edits are new versions; `tag` is immutable.
5. Provider quirk: `knowledge_base_id` (duplicate detection) only works on OpenAI — irrelevant while DD is out of scope, gate on provider if it returns.
6. Multiple URLs per attachment cell and Google-Drive-link rewriting are backend behaviors worth a hint in the Fields card copy.

---

## 9. Implementation sketch (for the next session — not started)

New/changed components (respecting the 500-LOC cap and `app/components/ui` kit):

- `ConfigEditorShell` — two-column layout: editor canvas + right panel (Model / Fields / Preview). Shared by Pre-filter and Assessment sections.
- `PromptDocument` — the stacked-zones editor canvas; composes `ZoneEditor` (textarea + highlight-overlay, extending `usePromptPlaceholderEditor` with token colorizing + attachment chips) per zone.
- `ResponseFormatBlock` — inline wrapper around the existing `OutputSchemaEditorInner` with quick-add row flow, all-required enforcement, on/off state, corner JSON toggle.
- `FieldsCard` — live derived-fields list with type selects and warnings; single source for deriving `input_schema`.
- `ReferenceDatasetPicker` — optional dataset select feeding columns + sample row into editor context.
- `ReviewAndSave` — slide-over: fields read-back, compatibility diff, assembled preview, model + pre-filter summaries, existing save modal flow.
- State: extend `useAssessmentWorkflow` / `usePromptAndConfigStep` rather than introducing a new store; template + zone contents serialize into the existing `AssessmentConfigBlob` builders in [assessmentFetcher.ts](../app/lib/utils/assessmentFetcher.ts) (plus `query_template` once B1 lands).

Suggested sequencing: (1) editor chassis + zones with `@` in Submission, (2) Fields card + derived input schema (delete ColumnMapperStep), (3) inline ResponseFormatBlock, (4) Pre-filter section on the shared chassis, (5) Review & save, (6) model-catalog migration, (7) cleanup/deletions. Backend B1/B3 can proceed in parallel and are prerequisites for shipping, not for starting.
