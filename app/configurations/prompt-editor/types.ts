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
  vector_store_ids: string[];
  max_num_results: number;
}

export interface ConfigBlob {
  completion: {
    provider: string;
    params: {
      model: string;
      instructions: string;
      temperature: number;
      tools: Tool[];
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

export interface Variant {
  id: string;
  configId: string;
  commitId: string;
  name: string;
}

export interface TestResult {
  variantId: string;
  score: number;
  latency: number;
}
