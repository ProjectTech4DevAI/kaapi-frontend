export interface ParsedCommit {
  isAIGenerated: boolean;
  fromVersion?: number;
  evaluation?: string;
  body: string;
}

export interface CommitMessageProps {
  message: string | null | undefined;
  className?: string;
  compact?: boolean;
}
