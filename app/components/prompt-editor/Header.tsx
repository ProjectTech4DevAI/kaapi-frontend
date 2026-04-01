import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import {
  ChevronRightIcon,
  ArrowBackCircleIcon,
  PlayCircleIcon,
  CheckCircleIcon,
} from "@/app/components/icons";

interface HeaderProps {
  currentConfigId?: string;
  currentConfigVersion?: number;
  currentConfigName?: string;
  hasUnsavedChanges?: boolean;
  datasetId?: string;
  experimentName?: string;
  fromEvaluations?: boolean;
}

export default function Header({
  currentConfigId,
  currentConfigVersion,
  currentConfigName,
  hasUnsavedChanges = false,
  datasetId,
  experimentName,
  fromEvaluations = false,
}: HeaderProps) {
  const router = useRouter();

  const handleUseInEvaluation = () => {
    const params = new URLSearchParams();
    if (currentConfigId && currentConfigVersion) {
      params.set("config", currentConfigId);
      params.set("version", currentConfigVersion.toString());
    }
    if (datasetId) params.set("dataset", datasetId);
    if (experimentName) params.set("experiment", experimentName);

    router.push(`/evaluations?${params.toString()}`);
  };

  return (
    <PageHeader
      actions={
        <button
          onClick={handleUseInEvaluation}
          disabled={hasUnsavedChanges}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            hasUnsavedChanges
              ? "bg-bg-secondary text-text-secondary border border-border cursor-not-allowed"
              : "bg-accent-primary text-white cursor-pointer hover:bg-accent-hover"
          }`}
          title={
            hasUnsavedChanges
              ? "Save your changes first"
              : fromEvaluations
                ? "Return to evaluation with this config"
                : "Use this config in an evaluation"
          }
        >
          {fromEvaluations ? <ArrowBackCircleIcon /> : <PlayCircleIcon />}
          {fromEvaluations ? "Back to Evaluation" : "Run Evaluation"}
        </button>
      }
    >
      <nav className="flex items-center gap-2 text-sm">
        <button
          onClick={() => router.push("/configurations")}
          className="font-medium transition-colors text-text-secondary hover:text-text-primary"
        >
          Configurations
        </button>
        <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
        <span className="font-semibold text-text-primary">
          {currentConfigName || "New Config"}
        </span>
        {currentConfigVersion && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
            v{currentConfigVersion}
          </span>
        )}
      </nav>

      <div className="flex items-center gap-2 ml-2">
        {hasUnsavedChanges && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#b45309] border border-[#fcd34d]">
            Unsaved
          </span>
        )}
        {fromEvaluations && datasetId && (
          <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-[#f0fdf4] text-status-success border border-[#86efac]">
            <CheckCircleIcon />
            Dataset ready
          </span>
        )}
      </div>
    </PageHeader>
  );
}
