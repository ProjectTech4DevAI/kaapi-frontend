// Placeholder prompts for the assessment config editors.
//
// The placeholders are full, real, working prompts — a teacher grading scanned
// answer sheets for a Class 8 Social Science paper — shown as grey ghost text
// in the empty editors so users see exactly what a good prompt looks like
// without it being prefilled content they must delete. The example dataset has
// a `submission` column holding a public URL to the scanned answer sheet.
//
// Deliberately no name/id references anywhere: personal columns are PII and
// the AI doesn't need them to assess a submission.

export const PLACEHOLDER_ASSESSMENT_INSTRUCTIONS = `Tell the AI who it is and how to assess. Example:

You are an experienced teacher assessing scanned answer sheets for a Class 8 Social Science paper (4 questions, 20 marks). Paste your question paper and marking scheme here.

Marking rules:
- Give full marks only if the answer covers every point the question asks for.
- Give partial marks if the core concept is right but details or examples are missing.
- Give 0 for unattempted questions; never exceed a question's maximum.
- Never penalize spelling, grammar, or handwriting.

Feedback:
- Write helpful, encouraging feedback for the student — start with what they did well, then point out one or two things to improve.`;

export const PLACEHOLDER_ASSESSMENT_SUBMISSION = `Describe what to assess in each row. Type @ to insert a column from your dataset. Example:

Assess the scanned answer sheet attached as a file (@submission). Read every page and grade all four questions.

Tip: share only the columns the AI needs — personal columns like names or ids are not required to assess a submission.`;

export const PLACEHOLDER_PREFILTER_CRITERIA = `Describe what counts as a valid submission. Example:

Accept the submission only if the attached file is a scanned or photographed handwritten answer sheet for the Social Science paper.

Reject it if the attachment is anything else — a selfie or photo of a person, an unrelated image, a blank or unreadable page, or a document unrelated to the exam.

When genuinely unsure, lean towards Accept — grading happens in the next step.`;

export const PLACEHOLDER_PREFILTER_SUBMISSION = `Point the AI at what matters in each row. Example:

Judge the attached file (@submission), not the text fields.`;

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

// Default attachment field for a new config, matching the example dataset.
export const DEFAULT_ATTACHMENT_FIELD = "submission" as const;
