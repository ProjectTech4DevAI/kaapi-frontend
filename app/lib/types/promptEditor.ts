import { ConfigBlob } from "@/app/lib/types/configs";
export type { Tool, ConfigBlob } from "@/app/lib/types/configs";

export interface Commit {
  id: string;
  content: string;
  timestamp: number;
  author: string;
  message: string;
  branch: string;
  parentId: string | null;
  mergeFrom?: string;
  mergeFromCommitId?: string;
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  oldLine: string | null;
  newLine: string | null;
  oldNum: number | null;
  newNum: number | null;
}

export interface DiffStats {
  additions: number;
  deletions: number;
}

export interface Config {
  id: string;
  name: string;
  version: number;
  timestamp: number;
  config_blob: ConfigBlob;
  commitMessage: string;
}

export interface LegacyVariant {
  id: string;
  configId: string;
  commitId: string;
  name: string;
}

export interface Variant {
  id: string;
  commitId: string;
  name: string;
}

export interface TestResult {
  variantId: string;
  score: number;
  latency: number;
}

export interface UnifiedCommit {
  id: string;

  promptContent: string;

  configBlob: ConfigBlob;
  configName: string;

  timestamp: number;
  author: string;
  message: string;
  branch: string;
  parentId: string | null;
  mergeFrom?: string;
  mergeFromCommitId?: string;
}

export interface ConfigDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  path: string;
  changed: boolean;
}

export interface UnifiedDiff {
  promptDiff: DiffLine[];
  configDiff: ConfigDiff[];
  stats: {
    promptAdditions: number;
    promptDeletions: number;
    configChanges: number;
  };
}
