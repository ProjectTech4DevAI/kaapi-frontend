export type JudgeConfigMode = "adhoc" | "saved";

export interface JudgeAdhocState {
  promptTemplate: string;
  model: string;
  temperature: number;
}

export interface JudgeSavedRefState {
  configId: string;
  version: number;
}

export interface JudgeConfigDraft {
  mode: JudgeConfigMode;
  adhoc: JudgeAdhocState;
  saved: JudgeSavedRefState;
}

export interface JudgeConfigBlobPayload {
  blob: {
    completion: {
      provider: "openai";
      type: "text";
      params: { model: string; temperature: number };
    };
    prompt_template: { template: string };
  };
}

export interface JudgeConfigRefPayload {
  id: string;
  version: number;
}

export type JudgeConfigPayload = JudgeConfigBlobPayload | JudgeConfigRefPayload;

export const DEFAULT_JUDGE_ADHOC: JudgeAdhocState = {
  promptTemplate: "",
  model: "gpt-4o-mini",
  temperature: 0.7,
};

export const DEFAULT_JUDGE_SAVED: JudgeSavedRefState = {
  configId: "",
  version: 0,
};

export const DEFAULT_JUDGE_DRAFT: JudgeConfigDraft = {
  mode: "adhoc",
  adhoc: DEFAULT_JUDGE_ADHOC,
  saved: DEFAULT_JUDGE_SAVED,
};
