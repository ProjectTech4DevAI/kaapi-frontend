// Assessment types: composite page/panel/step props that span sub-domains.
import type {
  AssessmentTab,
  AssessmentTabId,
  StateSetter,
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
  // Version the blob was loaded from (0 for a new config) — used for the
  // template store key and the removed-columns warning on version saves.
  configVersion: number;
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
    version: number,
  ) => void;
  onForbidden: () => void;
  onNext: () => void;
  // Which config scope to list/load. ASSESSMENT when rendered from the
  // assessment flow; default when reused from the configuration library.
  tag?: "default" | "ASSESSMENT";
}

// The editable config-authoring state shared by the Pre-filter and Assessment
// sections (owned by useAssessmentWorkflow, edited via useConfigEditor).
export interface ConfigEditorStateProps {
  columnMapping: ColumnMapping;
  setColumnMapping: ValueSetter<ColumnMapping>;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  outputSchema: SchemaProperty[];
  setOutputSchema: ValueSetter<SchemaProperty[]>;
  prefilterConfig: PrefilterConfig | null;
  setPrefilterConfig: ValueSetter<PrefilterConfig | null>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  configSeed: ConfigDraftSeed | null;
}

export interface AssessmentSectionProps extends ConfigEditorStateProps {
  onBack: () => void;
  // Called after a successful save so the workflow can mark the step complete.
  onSaved: () => void;
}

// Config tab: 1 Choose config -> 2 Pre-filter (optional) -> 3 Assessment
// (which ends in Review & save). The input schema is derived from the
// @-references in the Submission editor, not authored as a form.
export interface ConfigPanelProps extends ConfigEditorStateProps {
  completedSteps: Set<number>;
  configStep: number;
  setConfigStep: ValueSetter<number>;
  onStepComplete: ValueSetter<number>;
  onStartNewConfig: () => void;
  onLoadExistingConfig: (
    blob: AssessmentConfigBlob,
    configId: string,
    configName: string,
    version: number,
  ) => void;
  onForbidden: () => void;
}

// Experiment tab: pick a saved config + a dataset, then dispatch a run.
export interface ExperimentTabProps extends WithForbiddenHandler {
  // Saved-config picker (fed to useSavedConfigList).
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
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

export interface PostProcessingPanelProps {
  availableColumns: string[];
  fetchColumns?: () => Promise<string[]>;
  initialConfig: PostProcessingConfig | null;
  onSave: (config: PostProcessingConfig) => Promise<void>;
}
