// Assessment types: model configurations, versions, and config-selection UI.
import type {
  AssessmentConfigBlob,
  AssessmentInputSchemaColumn,
  CompletionConfig,
  ConfigPublic,
  ConfigVersionItems,
  ProviderType,
} from "@/app/lib/types/configs";
import type { LabeledValue, ValueSetter } from "./core";

export interface ConfigRef {
  config_id: string;
  config_version: number;
}

export interface ConfigSelection extends ConfigRef {
  name?: string;
  provider?: string;
  model?: string;
  // Stored input_schema of the selected config version, used to build the run's
  // input_binding without re-authoring a dataset mapping.
  input_schema?: Record<string, AssessmentInputSchemaColumn>;
}

export interface AssessmentRunConfigRef {
  id: string;
  version: number;
}

export type ConfigParamType = "float" | "int" | "enum";

export interface ConfigParamDefinition {
  type: ConfigParamType;
  default: number | string;
  description: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface AssessmentModelConfig {
  provider: ProviderType;
  model_name: string;
  config: Record<string, ConfigParamDefinition>;
}

export type ModelOption = LabeledValue;

export type ConfigMode = "existing" | "create";

// Config-tab save modal: create a brand-new config vs. a new version of one.
export type ConfigSaveMode = "new" | "version";

export interface VersionListState {
  items: ConfigVersionItems[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextSkip: number;
}

export type LatestConfigModel = { provider: string; model: string } | null;

export interface ConfigRunDetail {
  configId: string;
  version: number;
  name: string;
  description: string | null;
  commitMessage: string | null;
  provider: string | null;
  model: string | null;
}

export interface SavedConfigCardProps {
  config: ConfigPublic;
  versions: VersionListState;
  latestModel: LatestConfigModel;
  expanded: boolean;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
}

export interface ConfigCreatorProps {
  currentProvider: string;
  currentModel: string;
  providerModels: ModelOption[];
  currentParamDefs: Record<string, ConfigParamDefinition>;
  draftParams: Record<string, string | number | undefined>;
  configName: string;
  commitMessage: string;
  isSaving: boolean;
  // Save modal open-state is lifted so the trigger button can live in the
  // step-level footer while the modal renders here.
  isSaveModalOpen: boolean;
  setIsSaveModalOpen: ValueSetter<boolean>;
  // Save modal: new config vs. new version of an existing config.
  saveMode: ConfigSaveMode;
  setSaveMode: ValueSetter<ConfigSaveMode>;
  versionConfigId: string;
  setVersionConfigId: ValueSetter<string>;
  existingConfigs: ConfigPublic[];
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  onProviderChange: ValueSetter<CompletionConfig["provider"]>;
  onModelChange: ValueSetter<string>;
  onParamChange: (key: string, value: string | number) => void;
  onSave: () => void | Promise<void>;
}

export interface UsePromptAndConfigStepResult {
  promptStatus: string;
  responseSummary: string;
  hasConfiguredResponseFormat: boolean;
  canProceed: boolean;
  nextBlockerMessage: string;
  configMode: ConfigMode;
  setConfigMode: ValueSetter<ConfigMode>;
  removeSelection: (configId: string, version: number) => void;
  filteredConfigCards: ConfigPublic[];
  searchQuery: string;
  setSearchQuery: ValueSetter<string>;
  isLoadingConfigs: boolean;
  hasMoreConfigs: boolean;
  nextConfigSkip: number;
  expandedConfigId: string | null;
  versionStateByConfig: Record<string, VersionListState>;
  latestModelByConfig: Record<string, LatestConfigModel>;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  loadConfigs: (skip: number, replace: boolean) => Promise<void>;
  loadVersions: (configId: string, skip: number) => Promise<void>;
  toggleConfigExpansion: (configId: string) => void;
  toggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => Promise<void>;
  currentProvider: string;
  currentModel: string;
  providerModels: ModelOption[];
  currentParamDefs: Record<string, ConfigParamDefinition>;
  draftParams: Record<string, string | number | undefined>;
  configName: string;
  commitMessage: string;
  isSaving: boolean;
  saveMode: ConfigSaveMode;
  setSaveMode: ValueSetter<ConfigSaveMode>;
  versionConfigId: string;
  setVersionConfigId: ValueSetter<string>;
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  handleProviderChange: (provider: CompletionConfig["provider"]) => void;
  handleModelChange: (modelName: string) => void;
  updateDraftParam: (key: string, value: string | number) => void;
  handleCreateAndAdd: () => Promise<void>;
  configBlob: AssessmentConfigBlob;
}

// The Config tab renders only the "new configuration" builder (ConfigCreator);
// selecting an existing saved config to run lives in the Experiment tab.
export interface AssessmentConfigurationProps extends Omit<
  ConfigCreatorProps,
  "onSave"
> {
  onSaveConfig: () => void | Promise<void>;
}
