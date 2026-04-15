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
    validator_type: "llm_critic",
    validator_name: "LLM Critic",
    description:
      "Uses an LLM to critique and evaluate the quality and safety of generated text.",
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
};

export const KNOWN_SINGLE_OPTIONS: Record<string, string[]> = {
  categories: ["generic", "healthcare", "education", "all"],
};

export const GUARDRAILS_FIELD_TOOLTIPS: Record<string, string> = {
  validator_type:
    "Choose the validator you want to configure. Each validator enforces a specific rule on the input or output.",
  stage:
    'Where this validator runs — "input" checks the user\'s message before it reaches the LLM, "output" checks the LLM\'s response before it is returned.',
  on_fail_action:
    '"fix" attempts to auto-remediate the violation, "exception" raises an error and blocks the response, "rephrase" asks the model to rewrite the output.',
};
