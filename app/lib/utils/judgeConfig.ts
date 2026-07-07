import type {
  JudgeConfigDraft,
  JudgeConfigPayload,
} from "@/app/lib/types/judgeConfig";

export function buildJudgeConfigPayload(
  draft: JudgeConfigDraft,
): JudgeConfigPayload | undefined {
  if (draft.mode === "saved") {
    const { configId, version } = draft.saved;
    if (!configId || !version) return undefined;
    return { id: configId, version };
  }
  const { promptTemplate, model, temperature } = draft.adhoc;
  const hasPrompt = promptTemplate.trim().length > 0;
  if (!hasPrompt) return undefined;
  return {
    blob: {
      completion: {
        provider: "openai",
        type: "text",
        params: { model, temperature },
      },
      prompt_template: { template: promptTemplate },
    },
  };
}
