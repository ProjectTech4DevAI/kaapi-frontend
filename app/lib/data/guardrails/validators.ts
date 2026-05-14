import type { ValidatorMeta } from "@/app/lib/types/guardrails";

export const VALIDATOR_META: readonly ValidatorMeta[] = [
  {
    validator_type: "ban_list",
    validator_name: "Ban List",
    description:
      "Validates that the output does not contain banned words using fuzzy search.",
  },
  {
    validator_type: "gender_assumption_bias",
    validator_name: "Gender Assumption Bias",
    description:
      "Detects gender assumption biases across different domains like healthcare and education.",
  },
  {
    validator_type: "uli_slur_match",
    validator_name: "Lexical Slur Match",
    description:
      "Detects and filters offensive slurs in multiple languages using lexical matching.",
  },
  {
    validator_type: "pii_remover",
    validator_name: "PII Remover",
    description:
      "Detects and removes personally identifiable information (PII) from text.",
  },
  {
    validator_type: "llamaguard_7b",
    validator_name: "Llamaguard 7B",
    description:
      "Uses Meta's Llamaguard 7B model to detect unsafe or harmful content in text.",
  },
  {
    validator_type: "profanity_free",
    validator_name: "Profanity Free",
    description:
      "Detects and filters profane or offensive language from generated text.",
  },
  {
    validator_type: "topic_relevance",
    validator_name: "Topic Relevance",
    description:
      "Validates that the generated text stays on topic and is relevant to the given context.",
  },
  {
    validator_type: "nsfw_text",
    validator_name: "NSFW Text",
    description:
      "Detects and filters not-safe-for-work (NSFW) content from generated text.",
  },
] as const;

export const KNOWN_ARRAY_OPTIONS: Record<string, string[]> = {
  entity_types: [
    "CREDIT_CARD",
    "EMAIL_ADDRESS",
    "IBAN_CODE",
    "IP_ADDRESS",
    "LOCATION",
    "MEDICAL_LICENSE",
    "NRP",
    "PERSON",
    "PHONE_NUMBER",
    "URL",
    "IN_AADHAAR",
    "IN_PAN",
    "IN_PASSPORT",
    "IN_VEHICLE_REGISTRATION",
    "IN_VOTER",
  ],
  languages: ["en", "hi"],
  policies: [
    "no_violence_hate",
    "no_sexual_content",
    "no_criminal_planning",
    "no_guns_and_illegal_weapons",
    "no_illegal_drugs",
    "no_encourage_self_harm",
  ],
};

export const KNOWN_SINGLE_OPTIONS: Record<string, string[]> = {
  categories: ["generic", "healthcare", "education", "all"],
  llm_callable: ["gpt-4o-mini"],
  validation_method: ["sentence", "full"],
  device: ["cpu", "cuda"],
  model_name: [
    "textdetox/xlmr-large-toxicity-classifier",
    "michellejieli/NSFW_text_classifier",
  ],
};

export const VALIDATOR_DEFAULT_VALUES: Record<
  string,
  Record<string, unknown>
> = {
  nsfw_text: {
    model_name: "textdetox/xlmr-large-toxicity-classifier",
  },
};

export const VALIDATOR_FIELD_OPTIONS: Record<
  string,
  Record<string, string[]>
> = {
  nsfw_text: {
    model_name: [
      "textdetox/xlmr-large-toxicity-classifier",
      "michellejieli/NSFW_text_classifier",
    ],
    validation_method: ["sentence", "full"],
    device: ["cpu", "cuda"],
  },
};

export const GUARDRAILS_FIELD_TOOLTIPS: Record<string, string> = {
  validator_type:
    "Choose the validator you want to configure. Each validator enforces a specific rule on the input or output.",
  stage:
    'Where this validator runs — "input" checks the user\'s message before it reaches the LLM, "output" checks the LLM\'s response before it is returned.',
  on_fail_action:
    '"fix" attempts to auto-remediate the violation, "exception" raises an error and blocks the response, "rephrase" asks the model to rewrite the output.',
  llm_callable:
    "Model identifier passed to LiteLLM for evaluation (e.g. gpt-4o-mini, gpt-4o).",
  policies:
    "Content safety policies to enforce. Defaults to all policies. Each value maps to a specific rule (e.g. no_violence_hate, no_sexual_content).",
  threshold:
    "Probability score above which text is flagged (default: 0.8). Lower values are stricter.",
  validation_method:
    '"sentence" classifies each sentence independently — catches a single bad sentence in a longer message. "full" classifies the entire text as one unit.',
  device:
    "Inference device for the classification model — cpu or cuda (default: cpu).",
  model_name:
    "HuggingFace model used for classification. Defaults to textdetox/xlmr-large-toxicity-classifier.",
};
