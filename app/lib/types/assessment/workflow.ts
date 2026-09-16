import type { StepNavigationProps } from "./core";
import type { ColumnMapping, SchemaProperty } from "./dataset";
import type { AssessorSelection } from "./home";
import type { PostProcessingConfig } from "./results";
import type { AssessmentView, UseAssessmentWizardResult } from "./wizard";

export interface PageLayoutProps {
  view: AssessmentView;
  wizard: UseAssessmentWizardResult;
  homeSelection: AssessorSelection | null;
  onGoHome: () => void;
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
