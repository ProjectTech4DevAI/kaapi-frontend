import {
  SavedValidatorConfig,
  formatValidatorName,
} from "@/app/lib/types/guardrails";
import { GuardrailsShieldCheckIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui";
import { VALIDATOR_META_BY_TYPE } from "@/app/lib/utils/guardrails";
import SavedConfigsListSkeleton from "./SavedConfigsListSkeleton";

interface SavedConfigsListProps {
  configs: SavedValidatorConfig[];
  isLoading: boolean;
  selectedConfigId: string | null;
  onSelectConfig: (cfg: SavedValidatorConfig) => void;
  onNewConfig: () => void;
}

export default function SavedConfigsList({
  configs,
  isLoading,
  selectedConfigId,
  onSelectConfig,
  onNewConfig,
}: SavedConfigsListProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            Saved Configurations
          </div>
          {!isLoading && (
            <div className="text-xs text-text-secondary mt-0.5">
              {configs.length} config{configs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={onNewConfig}>
          + New Config
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <SavedConfigsListSkeleton />
        ) : configs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-primary/10">
              <GuardrailsShieldCheckIcon className="w-6 h-6 text-accent-primary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              No saved configurations yet
            </p>
            <p className="text-xs text-text-secondary">
              Click <span className="font-medium">+ New Config</span> to add
              your first one.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {configs.map((cfg) => {
              const isSelected = selectedConfigId === cfg.id;
              const displayName =
                VALIDATOR_META_BY_TYPE[cfg.type]?.validator_name ??
                formatValidatorName(cfg.type);
              return (
                <div
                  key={cfg.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => onSelectConfig(cfg)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectConfig(cfg);
                    }
                  }}
                  className={`w-full text-left rounded-lg p-4 transition-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 ${
                    isSelected
                      ? "bg-accent-primary/5 shadow-[0_6px_18px_rgba(31,68,150,0.18),0_2px_4px_rgba(31,68,150,0.08)]"
                      : "bg-bg-primary shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_22px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3
                      title={cfg.name}
                      className={`text-sm truncate max-w-[18rem] ${
                        isSelected
                          ? "font-semibold text-accent-primary"
                          : "font-medium text-text-primary"
                      }`}
                    >
                      {cfg.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                        {displayName}
                      </span>
                      {cfg.stage && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-primary border border-border">
                          {cfg.stage}
                        </span>
                      )}
                      {cfg.on_fail_action && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning-text border border-status-warning-border">
                          on fail: {cfg.on_fail_action}
                        </span>
                      )}
                      {cfg.is_enabled === false && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-status-error-bg text-status-error-text border border-status-error-border">
                          disabled
                        </span>
                      )}
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
