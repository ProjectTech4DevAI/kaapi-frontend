/**
 * Prompt Editor - Git-based Version Controlled Prompt Editor
 *
 * A WYSIWYG editor for managing prompts with git-like version control.
 * Features: store, edit, merge, compare prompts in a versioned manner.
 * Uses Myers diff algorithm for efficient change detection.
 */

"use client"
import React, { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import { colors } from '@/app/lib/colors';
import { Commit } from './types';
import { getAllBranches, getLatestCommitOnBranch } from './utils';
import Header from '@/app/components/prompt-editor/Header';
import HistorySidebar from '@/app/components/prompt-editor/HistorySidebar';
import EditorView from '@/app/components/prompt-editor/EditorView';
import DiffView from '@/app/components/prompt-editor/DiffView';
import BranchModal from '@/app/components/prompt-editor/BranchModal';
import MergeModal from '@/app/components/prompt-editor/MergeModal';

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

  const createBranch = () => {
    if (!newBranchName.trim()) return alert('Please enter a branch name');
    if (getAllBranches(commits).includes(newBranchName)) return alert('Branch already exists');

    const sourceCommit = branchFromCommit || getLatestCommitOnBranch(commits, currentBranch);
    if (!sourceCommit) return;
    setCurrentBranch(newBranchName);
    setCurrentContent(sourceCommit.content);
    setShowBranchModal(false);
    setNewBranchName('');
    setBranchFromCommit(null);
  };

  const switchBranch = (branchName: string) => {
    const latestCommit = getLatestCommitOnBranch(commits, branchName);
    if (latestCommit) setCurrentContent(latestCommit.content);
    setCurrentBranch(branchName);
    setSelectedCommit(null);
  };

  const commitVersion = () => {
    if (!commitMessage.trim()) return alert('Please enter a commit message');
    const latestCommit = getLatestCommitOnBranch(commits, currentBranch);
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
    const currentLatest = getLatestCommitOnBranch(commits, currentBranch);
    const targetLatest = getLatestCommitOnBranch(commits, mergeToBranch);
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


  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/configurations/prompt-editor" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            currentBranch={currentBranch}
            commits={commits}
            onSwitchBranch={switchBranch}
            onCreateBranch={() => {
              setBranchFromCommit(getLatestCommitOnBranch(commits, currentBranch));
              setShowBranchModal(true);
            }}
            onMerge={() => setShowMergeModal(true)}
          />

          <div className="flex flex-1 overflow-hidden">
            <HistorySidebar
              commits={commits}
              selectedCommit={selectedCommit}
              onSelectCommit={(commit) => {
                setSelectedCommit(commit);
                setCompareWith(null);
              }}
              onBackToEditor={() => {
                setSelectedCommit(null);
                setCompareWith(null);
              }}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              {!selectedCommit ? (
                <EditorView
                  currentBranch={currentBranch}
                  currentContent={currentContent}
                  commitMessage={commitMessage}
                  commits={commits}
                  onContentChange={setCurrentContent}
                  onCommitMessageChange={setCommitMessage}
                  onCommit={commitVersion}
                />
              ) : (
                <DiffView
                  selectedCommit={selectedCommit}
                  compareWith={compareWith}
                  commits={commits}
                  onCompareChange={setCompareWith}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <BranchModal
        isOpen={showBranchModal}
        branchFromCommit={branchFromCommit}
        newBranchName={newBranchName}
        onBranchNameChange={setNewBranchName}
        onCreate={createBranch}
        onClose={() => {
          setShowBranchModal(false);
          setNewBranchName('');
        }}
      />

      <MergeModal
        isOpen={showMergeModal}
        currentBranch={currentBranch}
        mergeToBranch={mergeToBranch}
        commits={commits}
        onMergeToBranchChange={setMergeToBranch}
        onMerge={mergeBranch}
        onClose={() => {
          setShowMergeModal(false);
          setMergeToBranch('');
        }}
      />
    </div>
  );
}
