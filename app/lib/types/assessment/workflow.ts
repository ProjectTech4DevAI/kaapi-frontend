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
import type { ConfigSelection, ConfigSaveMode } from "./config";
import type { ColumnMapping, PrefilterConfig, SchemaProperty } from "./dataset";
import type { PostProcessingConfig } from "./results";
import type { AssessmentConfigBlob } from "@/app/lib/types/configs";

// One-shot seed passed from the Configuration step to the Assessment step so a
// loaded config version hydrates the provider/model draft + save mode. `nonce`
// changes on every (re)load so the effect that applies it fires once per load.
export interface ConfigDraftSeed {
  blob: AssessmentConfigBlob | null;
  saveMode: ConfigSaveMode;
  configId: string;
  configName: string;
  nonce: number;
}

// Config flow step 1: start a new configuration or load an existing one (and a
// specific version) to edit into a new version.
export interface ConfigSelectStepProps {
  onStartNew: () => void;
  onLoadExisting: (
    blob: AssessmentConfigBlob,
    configId: string,
    configName: string,
  ) => void;
  onForbidden: () => void;
  onNext: () => void;
  // Which config scope to list/load. ASSESSMENT when rendered from the
  // assessment flow; default when reused from the configuration library.
  tag?: "default" | "ASSESSMENT";
}

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

export interface PromptPanelProps {
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
}

export interface ResponseSchemaProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  summary: string;
  hasFields: boolean;
}

// Config tab authors + saves a dataset-independent config (Mapper builds the
// input_schema directly -> Eliminatory -> Evaluation). Run submission lives in
// the Experiment tab, so no dataset/submit/postprocessing here.
export interface ConfigPanelProps {
  columnMapping: ColumnMapping;
  completedSteps: Set<number>;
  configStep: number;
  configs: ConfigSelection[];
  prefilterConfig: PrefilterConfig | null;
  outputSchema: SchemaProperty[];
  systemInstruction: string;
  promptTemplate: string;
  setColumnMapping: ValueSetter<ColumnMapping>;
  setConfigStep: ValueSetter<number>;
  setConfigs: StateSetter<ConfigSelection[]>;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  setSystemInstruction: ValueSetter<string>;
  setPromptTemplate: ValueSetter<string>;
  onStepComplete: ValueSetter<number>;
  configSeed: ConfigDraftSeed | null;
  onStartNewConfig: () => void;
  onLoadExistingConfig: (
    blob: AssessmentConfigBlob,
    configId: string,
    configName: string,
  ) => void;
  onForbidden: () => void;
}

// Experiment tab: pick a saved config + a dataset, then dispatch a run.
export interface ExperimentTabProps extends WithForbiddenHandler {
  // Saved-config picker (fed to usePromptAndConfigStep).
  textColumns: string[];
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  outputSchema: SchemaProperty[];
  systemInstruction: string;
  columnMapping: ColumnMapping;
  prefilterConfig: PrefilterConfig | null;
  // Dataset picker (fed to useAssessmentDatasetsTab).
  datasetId: string;
  datasetName: string;
  setDatasetId: ValueSetter<string>;
  setSelectedDatasetName: ValueSetter<string>;
  // Run dispatch.
  experimentName: string;
  setExperimentName: ValueSetter<string>;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitBlockerMessage: string;
  onSubmit: () => void;
}

export type EvaluationsTabProps = WithForbiddenHandler;

// The Datasets tab manages the dataset library (list / view / create / delete).
// Dataset selection for a run happens in the Experiment tab, not here.
export interface DatasetsTabProps extends WithForbiddenHandler {
  datasetId: string;
  setDatasetId: ValueSetter<string>;
  setSelectedDatasetName: ValueSetter<string>;
}

export interface PageLayoutProps {
  activeTab: AssessmentTabId;
  tabs: AssessmentTab[];
  onTabSwitch: ValueSetter<AssessmentTabId>;
  datasetsTabProps: DatasetsTabProps;
  configPanelProps: ConfigPanelProps;
  experimentTabProps: ExperimentTabProps;
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
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  outputSchema: SchemaProperty[];
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  columnMapping: ColumnMapping;
  prefilterConfig: PrefilterConfig | null;
  configSeed?: ConfigDraftSeed | null;
}
