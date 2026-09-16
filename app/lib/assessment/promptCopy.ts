/** Zone labels, hints and placeholders for the prompt editor steps. */
import type { PromptZoneCopy, PromptZoneId } from "@/app/lib/types/assessment";

/** Both zones of a step are the same height, so the card reads as one document. */
export const PREFILTER_ZONE_MIN_HEIGHT = 200;
export const ASSESSMENT_ZONE_MIN_HEIGHT = 280;

export const PREFILTER_ZONE_COPY: Record<PromptZoneId, PromptZoneCopy> = {
  instructions: {
    label: "Instructions",
    hint: "Same for every submission — what to Accept, what to Reject",
    placeholder:
      "Describe your accept/reject criteria. Example: Accept genuine student innovation submissions; reject empty, copied, or unrelated text.",
  },
  submission: {
    label: "Submission",
    hint: "Per submission row — type @ to reference submission columns · ? optional · * required",
    placeholder: "Type @ to reference submission columns, e.g. @Problem",
  },
};

export const ASSESSMENT_ZONE_COPY: Record<PromptZoneId, PromptZoneCopy> = {
  instructions: {
    label: "Instructions",
    hint: "Same for every submission — rubric, marking scheme, model answers",
    placeholder:
      "Tell the AI who it is and how to assess. Example: You are an experienced teacher assessing scanned answer sheets for a Class 8 Social Science paper (4 questions, 20 marks)…",
  },
  submission: {
    label: "Submission",
    hint: "Per submission row — type @ to reference submission columns · ? optional · * required",
    placeholder:
      "Lay out one submission. Type @ to reference submission columns, e.g. @Problem",
  },
};
