import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type {
  AssessorModelSelection,
  AssessorVersionDetail,
} from "./dataSource";
import type { SchemaProperty } from "./dataset";
import type { ProviderType } from "@/app/lib/types/configs";

export type PromptFieldType = "text" | "image" | "pdf";

export type PromptZoneId = "instructions" | "submission";

export interface PromptZones {
  instructions: string;
  submission: string;
}

export type PromptStepId = "prefilter" | "assessment";

export interface PromptZoneCopy {
  label: string;
  hint: string;
  placeholder: string;
}

export type PromptSegmentKind = "plain" | "text" | "attachment" | "unknown";

export interface PromptSegment {
  kind: PromptSegmentKind;
  text: string;
  name?: string;
}

export type PreviewBlockType = "h1" | "h2" | "li" | "p";

export interface PreviewBlock {
  type: PreviewBlockType;
  segments: PromptSegment[];
}

export interface WizardDraft {
  prefilterEnabled: boolean;
  prefilter: PromptZones;
  assessment: PromptZones;
  fieldTypes: Record<string, PromptFieldType>;
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

export type MentionStage = "type" | "strict";

export interface MentionColumnOption {
  name: string;
  isCreate: boolean;
  type: PromptFieldType;
}

export interface MentionTypeOption {
  type: PromptFieldType;
  label: string;
  isCurrent: boolean;
}

export interface MentionStrictOption {
  strict: boolean;
  label: string;
  hint: string;
  isCurrent: boolean;
}

export interface UsePromptMentionsParams {
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  value: string;
  onChange: (value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
}

export interface UsePromptMentionsResult {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  mirrorRef: RefObject<HTMLDivElement | null>;
  dropdownRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  position: { top: number; left: number } | null;
  activeIndex: number;
  pendingField: string | null;
  stage: MentionStage | null;
  columnOptions: MentionColumnOption[];
  typeOptions: MentionTypeOption[];
  strictOptions: MentionStrictOption[];
  onInput: (value: string, cursor: number) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  pickColumn: (option: MentionColumnOption) => void;
  pickType: (type: PromptFieldType) => void;
  pickStrict: (strict: boolean) => void;
  openStrictFor: (
    name: string,
    position: { top: number; left: number },
    via: "hover" | "click",
  ) => void;
  scheduleHoverClose: () => void;
  cancelHoverClose: () => void;
  closeAll: () => void;
}

export interface MentionDropdownProps {
  dropdownRef: RefObject<HTMLDivElement | null>;
  position: { top: number; left: number } | null;
  activeIndex: number;
  pendingField: string | null;
  stage: MentionStage | null;
  columnOptions: MentionColumnOption[];
  typeOptions: MentionTypeOption[];
  strictOptions: MentionStrictOption[];
  onPickColumn: (option: MentionColumnOption) => void;
  onPickType: (type: PromptFieldType) => void;
  onPickStrict: (strict: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface PreviewPaneProps {
  paneRef: RefObject<HTMLDivElement | null>;
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  sampleRow: Record<string, string>;
  disabledNote?: string;
}

export interface PromptZoneCardProps {
  zones: PromptZones;
  copy: Record<PromptZoneId, PromptZoneCopy>;
  zoneMinHeight: number;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  onZoneChange: (zone: PromptZoneId, value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
}

export interface PromptZoneEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight: number;
  enableMentions: boolean;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
  ariaLabel: string;
}

export interface EditorStepLayoutProps {
  children: ReactNode;
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  sampleRow: Record<string, string>;
  previewDisabledNote?: string;
}

export interface ModelChipProps {
  step: PromptStepId;
  selection: AssessorModelSelection;
  onModel: (step: PromptStepId, provider: ProviderType, model: string) => void;
  onParam: (step: PromptStepId, key: string, value: string | number) => void;
}

export interface ModelPickerProps {
  step: PromptStepId;
  selection: AssessorModelSelection;
  onModel: (step: PromptStepId, provider: ProviderType, model: string) => void;
  onParam: (step: PromptStepId, key: string, value: string | number) => void;
}
