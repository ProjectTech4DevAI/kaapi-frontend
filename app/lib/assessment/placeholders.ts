// Walkthrough placeholder copy for the assessment config editors.
//
// The examples double as a mini-tutorial for non-technical users (an NGO
// teacher grading scanned answer sheets), so each placeholder shows a complete,
// realistic prompt they can adapt. The imagined dataset is a CSV with three
// columns — id, name, submission (a public URL to a scanned/photographed
// answer sheet PDF or image).

export const PLACEHOLDER_ASSESSMENT_INSTRUCTIONS = `Tell the AI who it is and how to grade. Example:

You are an experienced Social Science teacher grading Class 8 answer sheets.

Grade each submission against this question paper (total 20 marks):
  Q1. Name the three organs of the Indian Union Government. (2 marks)
  Q2. Why does the Constitution provide for separation of powers? (4 marks)
  Q3. Explain any two Fundamental Rights, with one example each. (6 marks)
  Q4. "The judiciary is the guardian of the Constitution." Justify this statement. (8 marks)

Marking guidance:
- Award marks for correct concepts even when the wording is simple.
- Accept answers written in English or Hindi; never penalize spelling or grammar.
- Give partial marks when a point is partly correct; never exceed a question's maximum.
- If a question is not attempted, give 0 for that question.

Tip: you can also paste your model answers or marking scheme here so the AI grades against them.`;

export const PLACEHOLDER_ASSESSMENT_SUBMISSION = `Describe what to grade in each row. Type @ to insert a column from your dataset.

Example (for a dataset with columns id, name, submission):

Grade the scanned answer sheet submitted by student @name (roll no. @id).
The answer sheet is the attached file: @submission

For every student row, the AI receives this text with the real values filled in, plus any attached files, and grades them using your instructions above.`;

export const PLACEHOLDER_PREFILTER_RELEVANCE = `Describe what counts as a valid submission. Each row's text and attached files are shared with the AI automatically.

Example:

Accept a submission only if the attached file is a scanned or photographed HANDWRITTEN answer sheet for the Social Science paper — handwritten answers on ruled or plain paper, possibly across multiple pages.

Reject the submission if the attachment is anything else, for example:
- a selfie or any photo of a person
- a random or unrelated image
- a blank, dark, or unreadable page
- a screenshot, meme, or document unrelated to the exam

If both text and a file are present, judge relevance from the file first. When genuinely unsure, lean towards Accept — a later step does the actual grading.`;

// Example response-format fields matching the walkthrough above: marks per
// question, the reasoning behind them, and student-facing feedback.
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
