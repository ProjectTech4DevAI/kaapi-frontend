// Assessment types: model configurations, versions, and config-selection UI.
import type {
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
  // Submission template authored with the config (blob param when the backend
  // persists it, otherwise the author's localStorage mirror).
  query_template?: string;
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

// Shared model-configuration panel (provider + model + advanced params) used
// by both the Pre-filter and Assessment sections.
export interface ModelPanelProps {
  provider: string;
  model: string;
  providerModels: ModelOption[];
  paramDefs: Record<string, ConfigParamDefinition>;
  params: Record<string, string | number | undefined>;
  onProviderChange: ValueSetter<CompletionConfig["provider"]>;
  onModelChange: ValueSetter<string>;
  onParamChange: (key: string, value: string | number) => void;
}

// Saved-config listing/selection state (Experiment tab picker + the save
// dialog's "new version of existing" target list).
export interface UseSavedConfigListResult {
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
  addSelection: (selection: ConfigSelection) => void;
}
