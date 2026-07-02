// Assessment types: model configurations, versions, and config-selection UI.
import type {
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
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  handleProviderChange: (provider: CompletionConfig["provider"]) => void;
  handleModelChange: (modelName: string) => void;
  updateDraftParam: (key: string, value: string | number) => void;
  handleCreateAndAdd: () => Promise<void>;
}

export interface AssessmentConfigurationProps extends Omit<
  ConfigCreatorProps,
  "onSave"
> {
  configMode: ConfigMode;
  setConfigMode: ValueSetter<ConfigMode>;
  configs: ConfigSelection[];
  onRemoveConfig: (configId: string, version: number) => void;
  configCards: ConfigPublic[];
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
  onLoadMoreConfigs: (skip: number) => void | Promise<void>;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleConfigExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
  onSaveConfig: () => void | Promise<void>;
}
