import {
  Commit,
  ConfigBlob,
  UnifiedCommit,
} from "@/app/lib/types/promptEditor";

/**
 * Get all unique branches from commits
 */
const getAllBranches = (commits: Commit[]): string[] => {
  return [...new Set(commits.map((c) => c.branch))];
};

/**
 * Get all unique branches from unified commits
 */
export const getAllUnifiedBranches = (commits: UnifiedCommit[]): string[] => {
  return [...new Set(commits.map((c) => c.branch))];
};

const branchColors = ["#0969da", "#8250df", "#1f883d", "#d1242f", "#bf8700"];

/**
 * Get color for a branch based on its index
 */
export const getBranchColor = (
  commits: Commit[],
  branchName: string,
): string => {
  const index = getAllBranches(commits).indexOf(branchName);
  return branchColors[index % branchColors.length];
};

/**
 * Get color for a branch based on its index (unified version)
 */
export const getUnifiedBranchColor = (
  commits: UnifiedCommit[],
  branchName: string,
): string => {
  const index = getAllUnifiedBranches(commits).indexOf(branchName);
  return branchColors[index % branchColors.length];
};

/**
 * Check if config has changes compared to committed version
 */
export const hasConfigChanges = (
  current: ConfigBlob,
  committed: ConfigBlob,
): boolean => {
  return JSON.stringify(current) !== JSON.stringify(committed);
};
