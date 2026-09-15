// Assessment types: the prompt editor — zones, tokens, and the wizard's editable draft.
import type {
  AssessorModelSelection,
  AssessorVersionDetail,
} from "./dataSource";
import type { SchemaProperty } from "./dataset";
import type { ProviderType } from "@/app/lib/types/configs";

/** What a referenced submission column carries. Drives the input schema. */
export type PromptFieldType = "text" | "image" | "pdf";

export type PromptZoneId = "instructions" | "submission";

/** A prompt step's two zones: static instructions, and the per-row submission. */
export interface PromptZones {
  instructions: string;
  submission: string;
}

export type PromptStepId = "prefilter" | "assessment";

/** Labels and placeholder for one zone. Both zones share a height. */
export interface PromptZoneCopy {
  label: string;
  hint: string;
  placeholder: string;
}

export type PromptSegmentKind =
  | "plain"
  /** A known text column — `@Column`. */
  | "text"
  /** A known image/PDF column — `<Column>`. */
  | "attachment"
  /** Referenced but not a column of the selected set. */
  | "unknown";

export interface PromptSegment {
  kind: PromptSegmentKind;
  /** Literal text for `plain`, the raw token for the rest. */
  text: string;
  name?: string;
}

export type PreviewBlockType = "h1" | "h2" | "li" | "p";

export interface PreviewBlock {
  type: PreviewBlockType;
  segments: PromptSegment[];
}

/** Everything the wizard's steps 2–3 edit. */
export interface WizardDraft {
  prefilterEnabled: boolean;
  prefilter: PromptZones;
  assessment: PromptZones;
  fieldTypes: Record<string, PromptFieldType>;
  /** Columns a row may not leave blank. Absent means optional, the backend default. */
  fieldStrict: Record<string, boolean>;
  outputSchema: SchemaProperty[];
  models: Record<PromptStepId, AssessorModelSelection>;
}

export interface UseWizardDraftResult {
  draft: WizardDraft;
  setPrefilterEnabled: (enabled: boolean) => void;
  setZone: (step: PromptStepId, zone: PromptZoneId, value: string) => void;
  setFieldType: (name: string, type: PromptFieldType) => void;
  setFieldStrict: (name: string, strict: boolean) => void;
  setOutputSchema: (schema: SchemaProperty[]) => void;
  setModel: (step: PromptStepId, provider: ProviderType, model: string) => void;
  setModelParam: (
    step: PromptStepId,
    key: string,
    value: string | number,
  ) => void;
  loadFromVersion: (detail: AssessorVersionDetail) => void;
  reset: () => void;
}
