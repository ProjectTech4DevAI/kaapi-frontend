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
  type: 'added' | 'removed' | 'unchanged';
  oldLine: string | null;
  newLine: string | null;
  oldNum: number | null;
  newNum: number | null;
}

export interface DiffStats {
  additions: number;
  deletions: number;
}

export interface Tool {
  type: 'file_search';
  knowledge_base_ids: string[];
  max_num_results: number;
}

export interface ConfigBlob {
  completion: {
    provider: 'openai'; // | 'anthropic' | 'google'; // Only OpenAI supported for now
    type?: 'text' | 'stt' | 'tts'; // Config type - optional for backward compatibility
    params: {
      model: string;
      instructions: string;
      temperature: number;
      // Frontend uses tools array for UI
      tools?: Tool[];
      // Backend expects these as direct fields (flattened from tools array)
      knowledge_base_ids?: string[];
      max_num_results?: number;
    };
  };
}

export interface Config {
  id: string;
  name: string;
  version: number;
  timestamp: number;
  config_blob: ConfigBlob;
  commitMessage: string;
}

// Legacy Variant (for backward compatibility during migration)
export interface LegacyVariant {
  id: string;
  configId: string;
  commitId: string;
  name: string;
}

// Unified Variant - references only commitId (which contains both prompt and config)
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

// Unified Commit - combines prompt and config into single version-controlled entity
export interface UnifiedCommit {
  id: string;

  // Prompt data
  promptContent: string;

  // Config data (embedded in commit)
  configBlob: ConfigBlob;
  configName: string;

  // Version control metadata
  timestamp: number;
  author: string;
  message: string;
  branch: string;
  parentId: string | null;
  mergeFrom?: string;
  mergeFromCommitId?: string;
}

// Config diff for structured comparison
export interface ConfigDiff {
  field: string;
  oldValue: any;
  newValue: any;
  path: string;
  changed: boolean;
}

// Unified diff combining prompt and config changes
export interface UnifiedDiff {
  promptDiff: DiffLine[];
  configDiff: ConfigDiff[];
  stats: {
    promptAdditions: number;
    promptDeletions: number;
    configChanges: number;
  };
}
