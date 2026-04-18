import {
  SavedValidatorConfig,
  formatValidatorName,
} from "@/app/lib/types/guardrails";
import {
  TrashIcon,
  GuardrailsShieldCheckIcon,
  EditIcon,
} from "@/app/components/icons";
import Button from "@/app/components/Button";
import Loader from "@/app/components/Loader";
import { VALIDATOR_META_BY_TYPE } from "@/app/lib/utils/guardrails";

interface SavedConfigsListProps {
  configs: SavedValidatorConfig[];
  isLoading: boolean;
  selectedConfigId: string | null;
  onSelectConfig: (cfg: SavedValidatorConfig) => void;
  onDeleteConfig: (id: string) => void;
  onNewConfig: () => void;
}

export default function SavedConfigsList({
  configs,
  isLoading,
  selectedConfigId,
  onSelectConfig,
  onDeleteConfig,
  onNewConfig,
}: SavedConfigsListProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 bg-bg-primary">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            Saved Configurations
          </div>
          {!isLoading && (
            <div className="text-xs text-text-secondary">
              {configs.length} config{configs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <Button onClick={onNewConfig} size="sm" className="!rounded-lg">
          + New Config
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size="md" message="Loading saved configurations..." />
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-16 text-center">
            <GuardrailsShieldCheckIcon className="w-10 h-10 mb-3 text-border" />
            <p className="text-sm font-medium mb-1 text-text-primary">
              No saved configurations yet
            </p>
            <p className="text-xs text-text-secondary">
              Select a validator type on the left and save your first config
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => {
              const isSelected = selectedConfigId === cfg.id;
              const displayName =
                VALIDATOR_META_BY_TYPE[cfg.type]?.validator_name ??
                formatValidatorName(cfg.type);
              return (
                <div
                  key={cfg.id}
                  className={`rounded-xl border-l-2 bg-bg-primary shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
                    isSelected
                      ? "border-l-status-success"
                      : "border-l-amber-600"
                  }`}
                  onClick={() => onSelectConfig(cfg)}
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold mb-2 truncate text-text-primary">
                        {cfg.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-bg-secondary text-text-secondary">
                          {displayName}
                        </span>
                        {cfg.stage && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-bg-secondary text-text-secondary">
                            {cfg.stage}
                          </span>
                        )}
                        {cfg.on_fail_action && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-bg-secondary text-text-secondary">
                            on fail: {cfg.on_fail_action}
                          </span>
                        )}
                        {cfg.is_enabled === false && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700">
                            disabled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectConfig(cfg);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary transition-colors font-medium hover:bg-neutral-200"
                      >
                        <EditIcon className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConfig(cfg.id);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-status-error transition-colors font-medium hover:bg-red-100"
                      >
                        <TrashIcon className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
