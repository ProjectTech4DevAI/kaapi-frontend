import { Commit, DiffLine, ConfigBlob, ConfigDiff, UnifiedCommit, UnifiedDiff } from './types';

/**
 * Myers diff algorithm for optimized line-by-line diffing
 */
export const getLineDiff = (oldText: string, newText: string): DiffLine[] => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;
  const v: Record<number, number> = {};
  const trace: Record<number, number>[] = [];

  v[1] = 0;

  for (let d = 0; d <= max; d++) {
    trace.push({...v});
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }
      let y = x - k;

      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      v[k] = x;

      if (x >= n && y >= m) {
        const result: DiffLine[] = [];
        let x = n, y = m;

        for (let d = trace.length - 1; d >= 0; d--) {
          const v = trace[d];
          const k = x - y;

          let prevK;
          if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
            prevK = k + 1;
          } else {
            prevK = k - 1;
          }

          const prevX = v[prevK];
          const prevY = prevX - prevK;

          while (x > prevX && y > prevY) {
            result.unshift({
              type: 'unchanged',
              oldLine: oldLines[x - 1],
              newLine: newLines[y - 1],
              oldNum: x,
              newNum: y
            });
            x--;
            y--;
          }

          if (d > 0) {
            if (x === prevX) {
              result.unshift({
                type: 'added',
                oldLine: null,
                newLine: newLines[y - 1],
                oldNum: null,
                newNum: y
              });
              y--;
            } else {
              result.unshift({
                type: 'removed',
                oldLine: oldLines[x - 1],
                newLine: null,
                oldNum: x,
                newNum: null
              });
              x--;
            }
          }
        }

        return result;
      }
    }
  }

  return [];
};

/**
 * Get all unique branches from commits
 */
export const getAllBranches = (commits: Commit[]): string[] => {
  return [...new Set(commits.map(c => c.branch))];
};

/**
 * Get the latest commit on a specific branch
 */
export const getLatestCommitOnBranch = (commits: Commit[], branchName: string): Commit | null => {
  const branchCommits = commits.filter(c => c.branch === branchName);
  return branchCommits.length > 0 ? branchCommits[branchCommits.length - 1] : null;
};

/**
 * Get color for a branch based on its index
 */
export const getBranchColor = (commits: Commit[], branchName: string): string => {
  const branchColors = ['#0969da', '#8250df', '#1f883d', '#d1242f', '#bf8700'];
  const index = getAllBranches(commits).indexOf(branchName);
  return branchColors[index % branchColors.length];
};

/**
 * Get color for a branch based on its index (unified version)
 */
export const getUnifiedBranchColor = (commits: UnifiedCommit[], branchName: string): string => {
  const branchColors = ['#0969da', '#8250df', '#1f883d', '#d1242f', '#bf8700'];
  const index = getAllUnifiedBranches(commits).indexOf(branchName);
  return branchColors[index % branchColors.length];
};

/**
 * Format timestamp as relative time
 */
export const formatTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Compare two ConfigBlob objects and return the differences
 */
export const getConfigDiff = (oldConfig: ConfigBlob, newConfig: ConfigBlob): ConfigDiff[] => {
  const diffs: ConfigDiff[] = [];

  // Compare provider
  if (oldConfig.completion.provider !== newConfig.completion.provider) {
    diffs.push({
      field: 'provider',
      oldValue: oldConfig.completion.provider,
      newValue: newConfig.completion.provider,
      path: 'completion.provider',
      changed: true
    });
  }

  // Compare model
  if (oldConfig.completion.params.model !== newConfig.completion.params.model) {
    diffs.push({
      field: 'model',
      oldValue: oldConfig.completion.params.model,
      newValue: newConfig.completion.params.model,
      path: 'completion.params.model',
      changed: true
    });
  }

  // Compare instructions
  if (oldConfig.completion.params.instructions !== newConfig.completion.params.instructions) {
    diffs.push({
      field: 'instructions',
      oldValue: oldConfig.completion.params.instructions,
      newValue: newConfig.completion.params.instructions,
      path: 'completion.params.instructions',
      changed: true
    });
  }

  // Compare temperature
  if (oldConfig.completion.params.temperature !== newConfig.completion.params.temperature) {
    diffs.push({
      field: 'temperature',
      oldValue: oldConfig.completion.params.temperature,
      newValue: newConfig.completion.params.temperature,
      path: 'completion.params.temperature',
      changed: true
    });
  }

  // Compare tools (array comparison using JSON stringify for simplicity)
  const toolsDifferent = JSON.stringify(oldConfig.completion.params.tools) !==
                        JSON.stringify(newConfig.completion.params.tools);
  if (toolsDifferent) {
    diffs.push({
      field: 'tools',
      oldValue: oldConfig.completion.params.tools,
      newValue: newConfig.completion.params.tools,
      path: 'completion.params.tools',
      changed: true
    });
  }

  return diffs;
};

/**
 * Get unified diff combining prompt and config changes
 */
export const getUnifiedDiff = (oldCommit: UnifiedCommit, newCommit: UnifiedCommit): UnifiedDiff => {
  const promptDiff = getLineDiff(oldCommit.promptContent, newCommit.promptContent);
  const configDiff = getConfigDiff(oldCommit.configBlob, newCommit.configBlob);

  return {
    promptDiff,
    configDiff,
    stats: {
      promptAdditions: promptDiff.filter(d => d.type === 'added').length,
      promptDeletions: promptDiff.filter(d => d.type === 'removed').length,
      configChanges: configDiff.filter(d => d.changed).length
    }
  };
};

/**
 * Check if prompt has changes compared to committed version
 */
export const hasPromptChanges = (current: string, committed: string): boolean => {
  return current !== committed;
};

/**
 * Check if config has changes compared to committed version
 */
export const hasConfigChanges = (current: ConfigBlob, committed: ConfigBlob): boolean => {
  return JSON.stringify(current) !== JSON.stringify(committed);
};

/**
 * Auto-generate commit message based on what changed
 */
export const generateCommitMessage = (
  promptChanged: boolean,
  configChanged: boolean,
  configDiff: ConfigDiff[]
): string => {
  if (promptChanged && configChanged) {
    const configSummary = configDiff
      .slice(0, 2)
      .map(d => `${d.field}`)
      .join(', ');
    return `Updated prompt and config (${configSummary})`;
  }
  if (promptChanged) return 'Updated prompt';
  if (configChanged) {
    if (configDiff.length === 1) {
      const diff = configDiff[0];
      return `Updated ${diff.field}`;
    }
    return `Updated config (${configDiff.length} changes)`;
  }
  return 'No changes';
};

/**
 * Get all unique branches from unified commits
 */
export const getAllUnifiedBranches = (commits: UnifiedCommit[]): string[] => {
  return [...new Set(commits.map(c => c.branch))];
};

/**
 * Get the latest unified commit on a specific branch
 */
export const getLatestUnifiedCommitOnBranch = (commits: UnifiedCommit[], branchName: string): UnifiedCommit | null => {
  const branchCommits = commits.filter(c => c.branch === branchName);
  return branchCommits.length > 0 ? branchCommits[branchCommits.length - 1] : null;
};
