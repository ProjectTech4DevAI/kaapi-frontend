import { Commit, DiffLine } from './types';

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
