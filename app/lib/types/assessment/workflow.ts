// Assessment types: composite page/panel/step props that span sub-domains.
import type {
  AssessmentTab,
  AssessmentTabId,
  SampleRow,
  StateSetter,
  StepNavigationProps,
  ValueSetter,
  WithForbiddenHandler,
} from "./core";
import type { ConfigSelection } from "./config";
import type { ColumnMapping, PrefilterConfig, SchemaProperty } from "./dataset";
import type { PostProcessingConfig } from "./results";

export interface AssessmentFormState {
  experimentName: string;
  datasetId: string;
  datasetName: string;
  columns: string[];
  sampleRow: SampleRow;
  columnMapping: ColumnMapping;
  systemInstruction: string;
  promptTemplate: string;
  outputSchema: SchemaProperty[];
  configs: ConfigSelection[];
  prefilterConfig: PrefilterConfig | null;
  postProcessingConfig: PostProcessingConfig | null;
}

export interface ConfigPanelProps {
  canSubmitAssessment: boolean;
  columns: string[];
  columnMapping: ColumnMapping;
  completedSteps: Set<number>;
  configStep: number;
  configs: ConfigSelection[];
  datasetId: string | null;
  experimentName: string;
  formState: AssessmentFormState;
  hasDataset: boolean;
  isSubmitting: boolean;
  prefilterConfig: PrefilterConfig | null;
  outputSchema: SchemaProperty[];
  systemInstruction: string;
  promptTemplate: string;
  sampleRow: SampleRow;
  setActiveTabToDatasets: () => void;
  setColumnMapping: ValueSetter<ColumnMapping>;
  setConfigStep: ValueSetter<number>;
  setConfigs: StateSetter<ConfigSelection[]>;
  setExperimentName: ValueSetter<string>;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  setSystemInstruction: ValueSetter<string>;
  setPromptTemplate: ValueSetter<string>;
  postProcessingConfig: PostProcessingConfig | null;
  setPostProcessingConfig: ValueSetter<PostProcessingConfig | null>;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onStepComplete: ValueSetter<number>;
}

export type EvaluationsTabProps = WithForbiddenHandler;

export interface DatasetsTabProps extends WithForbiddenHandler {
  datasetId: string;
  setDatasetId: ValueSetter<string>;
  setSelectedDatasetName: ValueSetter<string>;
  onColumnsLoaded: (columns: string[], sampleRow?: SampleRow) => void;
  onNext: () => void;
}

export interface PageLayoutProps {
  activeTab: AssessmentTabId;
  tabs: AssessmentTab[];
  onTabSwitch: ValueSetter<AssessmentTabId>;
  datasetsTabProps: DatasetsTabProps;
  configPanelProps: ConfigPanelProps;
  evaluationsTabProps: EvaluationsTabProps;
}

export interface PostProcessingStepProps extends StepNavigationProps {
  postProcessingConfig: PostProcessingConfig | null;
  setPostProcessingConfig: (config: PostProcessingConfig | null) => void;
  columnMapping: ColumnMapping;
  outputSchema: SchemaProperty[];
}

export interface PostProcessingPanelProps {
  availableColumns: string[];
  fetchColumns?: () => Promise<string[]>;
  initialConfig: PostProcessingConfig | null;
  onSave: (config: PostProcessingConfig) => Promise<void>;
}

export interface PromptAndConfigStepProps extends StepNavigationProps {
  textColumns: string[];
  sampleRow: SampleRow;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  outputSchema: SchemaProperty[];
  setOutputSchema: ValueSetter<SchemaProperty[]>;
}
