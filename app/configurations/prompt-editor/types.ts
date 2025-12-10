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
