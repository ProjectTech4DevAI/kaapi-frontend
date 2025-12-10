/**
 * Magic Canvas - Git-based Version Controlled Prompt Editor
 *
 * A WYSIWYG editor for managing prompts with git-like version control.
 * Features: store, edit, merge, compare prompts in a versioned manner.
 * Uses Myers diff algorithm for efficient change detection.
 */

"use client"
import React, { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { colors } from '@/app/lib/colors';

interface Commit {
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

export default function MagicCanvasPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([
    {
      id: '1',
      content: 'You are a helpful AI assistant.\nYou provide clear and concise answers.\nYou are polite and professional.',
      timestamp: Date.now() - 7200000,
      author: 'User',
      message: 'Initial prompt',
      branch: 'main',
      parentId: null
    },
    {
      id: '2',
      content: 'You are a helpful AI assistant.\nYou provide detailed and accurate answers.\nYou are polite and professional.\nYou cite sources when possible.',
      timestamp: Date.now() - 3600000,
      author: 'User',
      message: 'Added source citation',
      branch: 'main',
      parentId: '1'
    }
  ]);

  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [currentContent, setCurrentContent] = useState<string>('You are a helpful AI assistant.\nYou provide detailed and accurate answers.\nYou are polite and professional.\nYou cite sources when possible.');
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [compareWith, setCompareWith] = useState<Commit | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [branchFromCommit, setBranchFromCommit] = useState<Commit | null>(null);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [mergeToBranch, setMergeToBranch] = useState<string>('');

  // Myers diff algorithm for optimized line-by-line diffing
  const getLineDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const n = oldLines.length;
    const m = newLines.length;
    const max = n + m;
    const v = {};
    const trace = [];

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
          const result = [];
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

  const getAllBranches = () => [...new Set(commits.map(c => c.branch))];
  const getLatestCommitOnBranch = (branchName: string): Commit | null => {
    const branchCommits = commits.filter(c => c.branch === branchName);
    return branchCommits.length > 0 ? branchCommits[branchCommits.length - 1] : null;
  };

  const getBranchColor = (branchName: string): string => {
    const branchColors = ['#0969da', '#8250df', '#1f883d', '#d1242f', '#bf8700'];
    const index = getAllBranches().indexOf(branchName);
    return branchColors[index % branchColors.length];
  };

  const createBranch = () => {
    if (!newBranchName.trim()) return alert('Please enter a branch name');
    if (getAllBranches().includes(newBranchName)) return alert('Branch already exists');

    const sourceCommit = branchFromCommit || getLatestCommitOnBranch(currentBranch);
    setCurrentBranch(newBranchName);
    setCurrentContent(sourceCommit.content);
    setShowBranchModal(false);
    setNewBranchName('');
    setBranchFromCommit(null);
  };

  const switchBranch = (branchName: string) => {
    const latestCommit = getLatestCommitOnBranch(branchName);
    if (latestCommit) setCurrentContent(latestCommit.content);
    setCurrentBranch(branchName);
    setSelectedCommit(null);
  };

  const commitVersion = () => {
    if (!commitMessage.trim()) return alert('Please enter a commit message');
    const latestCommit = getLatestCommitOnBranch(currentBranch);
    setCommits([...commits, {
      id: String(commits.length + 1),
      content: currentContent,
      timestamp: Date.now(),
      author: 'User',
      message: commitMessage,
      branch: currentBranch,
      parentId: latestCommit?.id || null
    }]);
    setCommitMessage('');
  };

  const mergeBranch = () => {
    if (!mergeToBranch) return alert('Please select a branch to merge into');
    const currentLatest = getLatestCommitOnBranch(currentBranch);
    const targetLatest = getLatestCommitOnBranch(mergeToBranch);
    if (!currentLatest) return alert('No commits on current branch to merge');

    const lastMerge = commits
      .filter(c => c.branch === mergeToBranch && c.mergeFrom === currentBranch)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastMerge) {
      const newCommits = commits.filter(c => c.branch === currentBranch && c.timestamp > lastMerge.timestamp);
      if (newCommits.length === 0) return alert(`Nothing to merge. No new commits on "${currentBranch}" since the last merge.`);
    }

    setCommits([...commits, {
      id: String(commits.length + 1),
      content: currentLatest.content,
      timestamp: Date.now(),
      author: 'User',
      message: `Merge ${currentBranch} into ${mergeToBranch}`,
      branch: mergeToBranch,
      parentId: targetLatest?.id || null,
      mergeFrom: currentBranch,
      mergeFromCommitId: currentLatest.id
    }]);
    setCurrentBranch(mergeToBranch);
    setCurrentContent(currentLatest.content);
    setShowMergeModal(false);
    setMergeToBranch('');
  };

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const diffLines = selectedCommit && compareWith ? getLineDiff(compareWith.content, selectedCommit.content) : [];
  const stats = diffLines.reduce((acc, line) => {
    if (line.type === 'added') acc.additions++;
    if (line.type === 'removed') acc.deletions++;
    return acc;
  }, { additions: 0, deletions: 0 });

  const renderTree = () => {
    const rendered = new Set<string>();
    const renderCommit = (commit: Commit, depth = 0, isLastChild = true, verticalLines: boolean[] = []): React.ReactElement | null => {
      if (rendered.has(commit.id)) return null;
      rendered.add(commit.id);
      const children = commits.filter(c => c.parentId === commit.id).sort((a, b) => a.timestamp - b.timestamp);

      return (
        <div key={commit.id}>
          <div className="flex items-start mb-1">
            {verticalLines.map((showLine, idx) => (
              <div key={idx} className="relative" style={{ width: '28px', height: '36px' }}>
                {showLine && <div className="absolute" style={{
                  left: '13px',
                  top: 0,
                  width: '2px',
                  height: '100%',
                  backgroundColor: colors.border
                }} />}
              </div>
            ))}

            {depth > 0 && (
              <div className="relative" style={{ width: '28px', height: '36px' }}>
                <div className="absolute" style={{
                  left: '13px',
                  top: 0,
                  width: '2px',
                  height: '18px',
                  backgroundColor: colors.border
                }} />
                <div className="absolute" style={{
                  left: '13px',
                  top: '18px',
                  width: '15px',
                  height: '2px',
                  backgroundColor: colors.border
                }} />
                {!isLastChild && <div className="absolute" style={{
                  left: '13px',
                  top: '18px',
                  width: '2px',
                  height: '18px',
                  backgroundColor: colors.border
                }} />}
              </div>
            )}

            <div className="rounded-full relative flex-shrink-0" style={{
              width: '14px',
              height: '14px',
              background: getBranchColor(commit.branch),
              border: `2px solid ${colors.bg.primary}`,
              boxShadow: `0 0 0 2px ${getBranchColor(commit.branch)}`,
              marginTop: '11px',
              marginRight: '10px'
            }}>
              {commit.mergeFrom && (
                <div className="absolute rounded-full" style={{
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  background: '#8250df',
                  border: `1px solid ${colors.bg.primary}`
                }} />
              )}
            </div>

            <div
              className="flex-1 rounded-md cursor-pointer"
              style={{
                padding: '8px 12px',
                backgroundColor: selectedCommit?.id === commit.id ? colors.bg.secondary : colors.bg.primary,
                borderTop: selectedCommit?.id === commit.id ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
                borderRight: selectedCommit?.id === commit.id ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
                borderBottom: selectedCommit?.id === commit.id ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border}`,
                borderLeft: `3px solid ${getBranchColor(commit.branch)}`,
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setSelectedCommit(commit); setCompareWith(null); }}
              onMouseEnter={(e) => {
                if (selectedCommit?.id !== commit.id) {
                  e.currentTarget.style.backgroundColor = colors.bg.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCommit?.id !== commit.id) {
                  e.currentTarget.style.backgroundColor = colors.bg.primary;
                }
              }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: colors.text.primary }}>
                {commit.message}
              </div>
              <div className="text-[10px] flex items-center gap-2 flex-wrap" style={{ color: colors.text.secondary }}>
                <span className="px-2 py-0.5 rounded-full font-semibold" style={{
                  backgroundColor: getBranchColor(commit.branch) + '20',
                  color: getBranchColor(commit.branch)
                }}>
                  {commit.branch}
                </span>
                <span>#{commit.id}</span>
                <span>•</span>
                <span>{formatTime(commit.timestamp)}</span>
                {commit.mergeFrom && (
                  <>
                    <span>•</span>
                    <span className="font-semibold" style={{ color: '#8250df' }}>
                      ← {commit.mergeFrom}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {children.length > 0 && (
            <div>
              {children.map((child, idx) => renderCommit(child, depth + 1, idx === children.length - 1, depth > 0 ? [...verticalLines, !isLastChild] : []))}
            </div>
          )}
        </div>
      );
    };

    const roots = commits.filter(c => !c.parentId).sort((a, b) => a.timestamp - b.timestamp);
    return roots.map(root => renderCommit(root, 0, true, []));
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations/prompt-editor" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded flex-shrink-0"
                  style={{
                    borderWidth: '1px',
                    borderColor: colors.border,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.secondary,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bg.secondary;
                    e.currentTarget.style.color = colors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bg.primary;
                    e.currentTarget.style.color = colors.text.secondary;
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {sidebarCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    )}
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-semibold" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>Magic Canvas</h1>
                  <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>Version-controlled prompt editor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={currentBranch}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="px-3 py-2 rounded-md text-sm"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {getAllBranches().map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button
                  onClick={() => { setBranchFromCommit(getLatestCommitOnBranch(currentBranch)); setShowBranchModal(true); }}
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: colors.bg.primary,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
                >
                  + Branch
                </button>
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                >
                  Merge
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* History Sidebar */}
            <div
              className="border-r flex flex-col"
              style={{
                width: '320px',
                backgroundColor: colors.bg.primary,
                borderColor: colors.border
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                <div className="text-sm font-semibold mb-1" style={{ color: colors.text.primary }}>Commit History</div>
                <div className="text-xs" style={{ color: colors.text.secondary }}>
                  {commits.length} commits • {getAllBranches().length} branches
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3">{renderTree()}</div>
              {selectedCommit && (
                <div className="p-3 border-t" style={{ borderColor: colors.border }}>
                  <button
                    onClick={() => { setSelectedCommit(null); setCompareWith(null); }}
                    className="w-full px-4 py-2 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: colors.bg.primary,
                      color: colors.text.primary,
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                  >
                    ← Back to Editor
                  </button>
                </div>
              )}
            </div>

            {/* Editor/Diff Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedCommit ? (
                // Editor
                <div className="flex-1 p-6 overflow-auto" style={{ backgroundColor: colors.bg.secondary }}>
                  <div className="max-w-4xl mx-auto">
                    <div className="text-sm mb-4" style={{ color: colors.text.secondary }}>
                      Editing on <strong style={{ color: getBranchColor(currentBranch) }}>{currentBranch}</strong>
                    </div>
                    <textarea
                      value={currentContent}
                      onChange={(e) => setCurrentContent(e.target.value)}
                      className="w-full rounded-md text-sm focus:outline-none"
                      style={{
                        minHeight: '400px',
                        padding: '16px',
                        border: `1px solid ${colors.border}`,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        marginBottom: '16px',
                        resize: 'vertical',
                        backgroundColor: colors.bg.primary,
                        color: colors.text.primary
                      }}
                      placeholder="Write your prompt here..."
                    />
                    <div className="border rounded-lg p-4" style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.border
                    }}>
                      <input
                        type="text"
                        placeholder="Describe your changes..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="w-full px-4 py-2 rounded-md text-sm mb-3 focus:outline-none"
                        style={{
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.bg.primary,
                          color: colors.text.primary
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && commitVersion()}
                      />
                      <button
                        onClick={commitVersion}
                        disabled={!commitMessage.trim()}
                        className="px-6 py-2 rounded-md text-sm font-medium"
                        style={{
                          backgroundColor: commitMessage.trim() ? colors.accent.primary : colors.bg.secondary,
                          color: commitMessage.trim() ? colors.bg.primary : colors.text.secondary,
                          border: 'none',
                          cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (commitMessage.trim()) {
                            e.currentTarget.style.backgroundColor = colors.accent.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (commitMessage.trim()) {
                            e.currentTarget.style.backgroundColor = colors.accent.primary;
                          }
                        }}
                      >
                        Commit to {currentBranch}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Diff View
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b" style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border
                  }}>
                    <div className="mb-3">
                      <div className="text-lg font-semibold mb-1" style={{ color: colors.text.primary }}>
                        {selectedCommit.message}
                      </div>
                      <div className="text-xs" style={{ color: colors.text.secondary }}>
                        {formatTime(selectedCommit.timestamp)} • <span style={{ color: getBranchColor(selectedCommit.branch) }}>{selectedCommit.branch}</span>
                        {selectedCommit.mergeFrom && <span style={{ color: '#8250df' }}> ← merged from {selectedCommit.mergeFrom}</span>}
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <select
                        onChange={(e) => setCompareWith(commits.find(c => c.id === e.target.value))}
                        value={compareWith?.id || ''}
                        className="px-3 py-2 rounded-md text-sm"
                        style={{
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.bg.primary,
                          color: colors.text.primary,
                          minWidth: '240px',
                          outline: 'none'
                        }}
                      >
                        <option value="">View content</option>
                        <option disabled>─────────────</option>
                        {commits.filter(c => c.id !== selectedCommit.id).map(c => (
                          <option key={c.id} value={c.id}>Compare with #{c.id}: {c.message}</option>
                        ))}
                      </select>
                      {compareWith && compareWith.id !== selectedCommit.id && (
                        <div className="text-xs px-3 py-2 rounded-md" style={{
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.secondary
                        }}>
                          <span style={{ color: colors.status.success }}>+{stats.additions}</span> / <span style={{ color: colors.status.error }}>-{stats.deletions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto" style={{ backgroundColor: colors.bg.secondary }}>
                    {compareWith && compareWith.id !== selectedCommit.id ? (
                      <div className="flex min-h-full">
                        <div className="flex-1 border-r" style={{
                          backgroundColor: colors.bg.primary,
                          borderColor: colors.border
                        }}>
                          <div className="px-4 py-2 border-b text-xs font-semibold" style={{
                            backgroundColor: colors.bg.secondary,
                            borderColor: colors.border,
                            color: colors.text.secondary
                          }}>
                            #{compareWith.id}: {compareWith.message}
                          </div>
                          {diffLines.map((line, idx) => (
                            <div key={idx} className="flex" style={{
                              backgroundColor: line.type === 'removed' ? '#ffebe9' : line.type === 'unchanged' ? colors.bg.primary : colors.bg.secondary,
                              minHeight: '22px'
                            }}>
                              <div className="text-right text-xs border-r" style={{
                                width: '50px',
                                padding: '2px 10px',
                                color: colors.text.secondary,
                                backgroundColor: line.type === 'removed' ? '#ffdddb' : colors.bg.secondary,
                                borderColor: colors.border,
                                fontFamily: 'ui-monospace, monospace',
                                userSelect: 'none'
                              }}>
                                {line.oldNum || ''}
                              </div>
                              <div className="flex-1 text-xs" style={{
                                padding: '2px 12px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                lineHeight: '18px',
                                whiteSpace: 'pre',
                                color: line.type === 'removed' ? '#82071e' : colors.text.primary
                              }}>
                                {line.type === 'removed' && <span style={{ color: colors.status.error, marginRight: '6px' }}>-</span>}
                                {line.oldLine || ''}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex-1" style={{ backgroundColor: colors.bg.primary }}>
                          <div className="px-4 py-2 border-b text-xs font-semibold" style={{
                            backgroundColor: colors.bg.secondary,
                            borderColor: colors.border,
                            color: colors.text.secondary
                          }}>
                            #{selectedCommit.id}: {selectedCommit.message}
                          </div>
                          {diffLines.map((line, idx) => (
                            <div key={idx} className="flex" style={{
                              backgroundColor: line.type === 'added' ? '#dafbe1' : line.type === 'unchanged' ? colors.bg.primary : colors.bg.secondary,
                              minHeight: '22px'
                            }}>
                              <div className="text-right text-xs border-r" style={{
                                width: '50px',
                                padding: '2px 10px',
                                color: colors.text.secondary,
                                backgroundColor: line.type === 'added' ? '#bef5cb' : colors.bg.secondary,
                                borderColor: colors.border,
                                fontFamily: 'ui-monospace, monospace',
                                userSelect: 'none'
                              }}>
                                {line.newNum || ''}
                              </div>
                              <div className="flex-1 text-xs" style={{
                                padding: '2px 12px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                lineHeight: '18px',
                                whiteSpace: 'pre',
                                color: line.type === 'added' ? '#116329' : colors.text.primary
                              }}>
                                {line.type === 'added' && <span style={{ color: colors.status.success, marginRight: '6px' }}>+</span>}
                                {line.newLine || ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-full p-6" style={{ backgroundColor: colors.bg.primary }}>
                        <pre className="text-sm" style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          lineHeight: '1.6',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          color: colors.text.primary
                        }}>
                          {selectedCommit.content}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000
        }}>
          <div className="rounded-lg p-6 shadow-xl" style={{
            backgroundColor: colors.bg.primary,
            width: '400px'
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
              Create New Branch
            </h3>
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: colors.text.secondary }}>
                From: <strong>#{branchFromCommit?.id}</strong> - {branchFromCommit?.message}
              </label>
              <input
                type="text"
                placeholder="Branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary
                }}
                onKeyDown={(e) => e.key === 'Enter' && createBranch()}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowBranchModal(false); setNewBranchName(''); }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
              >
                Cancel
              </button>
              <button
                onClick={createBranch}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: colors.bg.primary,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000
        }}>
          <div className="rounded-lg p-6 shadow-xl" style={{
            backgroundColor: colors.bg.primary,
            width: '450px'
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
              Merge Branch
            </h3>
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: colors.text.secondary }}>
                Merge <strong style={{ color: getBranchColor(currentBranch) }}>{currentBranch}</strong> into:
              </label>
              <select
                value={mergeToBranch}
                onChange={(e) => setMergeToBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary
                }}
              >
                <option value="">Select target branch...</option>
                {getAllBranches().filter(b => b !== currentBranch).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {mergeToBranch && (() => {
              const lastMerge = commits.filter(c => c.branch === mergeToBranch && c.mergeFrom === currentBranch).sort((a, b) => b.timestamp - a.timestamp)[0];
              const newCommits = lastMerge ? commits.filter(c => c.branch === currentBranch && c.timestamp > lastMerge.timestamp) : commits.filter(c => c.branch === currentBranch);
              return (
                <div className="p-3 rounded-md mb-4 text-xs" style={{
                  backgroundColor: newCommits.length > 0 ? '#dafbe1' : '#fff8c5',
                  border: `1px solid ${newCommits.length > 0 ? colors.status.success : colors.status.warning}`,
                }}>
                  {newCommits.length > 0 ? (
                    <>
                      <strong style={{ color: '#116329' }}>✓ Ready</strong>
                      <div style={{ color: '#116329', marginTop: '4px' }}>
                        {newCommits.length} new commit{newCommits.length > 1 ? 's' : ''}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#7d4e00' }}>⚠ No changes</strong>
                      <div style={{ color: '#7d4e00', marginTop: '4px' }}>
                        No new commits since last merge
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowMergeModal(false); setMergeToBranch(''); }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
              >
                Cancel
              </button>
              <button
                onClick={mergeBranch}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: colors.bg.primary,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
