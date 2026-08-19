// Default prompts and placeholder copy for the assessment config editors.
//
// New configs start prefilled with a short, real, working example — a teacher
// grading scanned answer sheets for a Class 8 Social Science paper, from a
// dataset with three columns: id, name, submission (a public URL to the
// scanned/photographed answer sheet). Users edit these into their own use
// case; the placeholders (shown only when an editor is emptied) explain the
// mechanics.

// ---- Real default prompts (prefilled into a new config) -------------------

export const DEFAULT_ASSESSMENT_INSTRUCTIONS = `You are an experienced teacher grading scanned answer sheets for a Class 8 Social Science paper (total 20 marks).

Question paper:
Q1. Name the three organs of the Indian Union Government. (2 marks)
Q2. Why does the Constitution provide for separation of powers? (4 marks)
Q3. Explain any two Fundamental Rights, with one example each. (6 marks)
Q4. "The judiciary is the guardian of the Constitution." Justify this statement. (8 marks)

How to grade:
- Award marks for correct concepts even when the wording is simple.
- Give partial marks for partly correct answers; never exceed a question's maximum.
- If a question is not attempted, give 0 for it.
- Do not penalize spelling, grammar, or handwriting.`;

export const DEFAULT_ASSESSMENT_SUBMISSION = `Grade the answer sheet submitted by {name} (id: {id}).
The scanned answer sheet is attached as a file. Read every page and grade all four questions.`;

export const DEFAULT_PREFILTER_CRITERIA = `Accept the submission only if the attached file is a scanned or photographed handwritten answer sheet for the Social Science paper.

Reject it if the attachment is anything else — a selfie or photo of a person, an unrelated image, a blank or unreadable page, or a document unrelated to the exam.

When genuinely unsure, lean towards Accept — grading happens in the next step.`;

export const DEFAULT_PREFILTER_SUBMISSION = `Judge the file attached for {name} (id: {id}), not the text fields.`;

// Default response-format fields matching the example above: marks per
// question, the reasoning behind them, and feedback for the submitter.
export const EXAMPLE_RESPONSE_FORMAT_FIELDS: ReadonlyArray<{
  name: string;
  type: "integer" | "string";
}> = [
  { name: "q1_marks", type: "integer" },
  { name: "q2_marks", type: "integer" },
  { name: "q3_marks", type: "integer" },
  { name: "q4_marks", type: "integer" },
  { name: "reasoning", type: "string" },
  { name: "overall_feedback", type: "string" },
];

// Default fields for a new config, matching the example dataset (id, name,
// submission) and the default prompts above.
export const DEFAULT_TEXT_FIELDS = ["name", "id"] as const;
export const DEFAULT_ATTACHMENT_FIELD = "submission" as const;

// ---- Placeholder copy (shown when an editor is emptied) -------------------

export const PLACEHOLDER_ASSESSMENT_INSTRUCTIONS = `Tell the AI who it is and how to assess — the rubric, the marking scheme, model answers. These instructions are the same for every submission.

Example: "You are an experienced teacher grading Class 8 Social Science answer sheets against this question paper: …"`;

export const PLACEHOLDER_ASSESSMENT_SUBMISSION = `Describe what to assess in each row. Type @ to insert a column from your dataset.

Example: "Grade the answer sheet submitted by @name (id: @id). The scanned answer sheet is attached."

For every submission row, the AI receives this text with the real values filled in, plus any attached files.`;

export const PLACEHOLDER_PREFILTER_CRITERIA = `Describe what counts as a valid submission — what to Accept and what to Reject.

Example: "Accept only scanned handwritten answer sheets. Reject selfies, unrelated images, blank pages, or anything that is not the exam paper."`;

export const PLACEHOLDER_PREFILTER_SUBMISSION = `Point the AI at what matters in each row. Type @ to reference a column.

Example: "Judge the file attached for @name, not the text fields."`;
