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
import { Commit, Config, Tool, Variant, TestResult } from './types';
import { getAllBranches, getLatestCommitOnBranch } from './utils';
import Header from '@/app/components/prompt-editor/Header';
import HistorySidebar from '@/app/components/prompt-editor/HistorySidebar';
import EditorView from '@/app/components/prompt-editor/EditorView';
import DiffView from '@/app/components/prompt-editor/DiffView';
import BranchModal from '@/app/components/prompt-editor/BranchModal';
import MergeModal from '@/app/components/prompt-editor/MergeModal';
import ConfigDrawer from '@/app/components/prompt-editor/ConfigDrawer';

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

  // Drawer and Configuration State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<string>('current');
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [configName, setConfigName] = useState<string>('');
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState<string>('gpt-4o-mini');
  const [instructions, setInstructions] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [tools, setTools] = useState<Tool[]>([]);
  const [configCommitMsg, setConfigCommitMsg] = useState<string>('');

  // A/B Testing State
  const [variants, setVariants] = useState<Variant[]>([
    { id: 'A', configId: '', commitId: '', name: 'Variant A' },
    { id: 'B', configId: '', commitId: '', name: 'Variant B' }
  ]);
  const [testInput, setTestInput] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);

  const createBranch = () => {
    if (!newBranchName.trim()) return alert('Please enter a branch name');
    if (getAllBranches(commits).includes(newBranchName)) return alert('Branch already exists');

    const sourceCommit = branchFromCommit || getLatestCommitOnBranch(commits, currentBranch);
    if (!sourceCommit) return;
    setCurrentBranch(newBranchName);

    // Only reset content if explicitly branching from a different commit
    // If branchFromCommit is null, we're branching from current HEAD, so preserve working changes
    if (branchFromCommit && branchFromCommit.id !== sourceCommit.id) {
      setCurrentContent(sourceCommit.content);
    }
    // Otherwise keep currentContent as-is to preserve uncommitted changes

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

  // Configuration Management Functions
  const saveConfig = () => {
    if (!configName.trim()) return alert('Please enter a configuration name');

    // Find existing configs with the same name to determine version
    const existingConfigs = configs.filter(c => c.name === configName);
    const version = existingConfigs.length > 0
      ? Math.max(...existingConfigs.map(c => c.version)) + 1
      : 1;

    const newConfig: Config = {
      id: `cfg_${Date.now()}`,
      name: configName,
      version,
      timestamp: Date.now(),
      config_blob: {
        completion: {
          provider,
          params: {
            model,
            instructions,
            temperature,
            tools,
          },
        },
      },
      commitMessage: configCommitMsg,
    };

    setConfigs([...configs, newConfig]);
    setSelectedConfigId(newConfig.id);
    setConfigCommitMsg('');
    alert(`Configuration "${configName}" (v${version}) saved successfully!`);
  };

  const loadConfig = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    setSelectedConfigId(configId);
    setConfigName(config.name);
    setProvider(config.config_blob.completion.provider);
    setModel(config.config_blob.completion.params.model);
    setInstructions(config.config_blob.completion.params.instructions);
    setTemperature(config.config_blob.completion.params.temperature);
    setTools(config.config_blob.completion.params.tools);
    setDrawerTab('current');
  };

  const useCurrentPrompt = () => {
    setInstructions(currentContent);
  };

  const runABTest = async () => {
    if (!testInput.trim()) return alert('Please enter test input');

    // Validate that all variants have config and commit selected
    const invalidVariants = variants.filter(v => !v.configId || !v.commitId);
    if (invalidVariants.length > 0) {
      return alert('Please select both configuration and prompt for all variants');
    }

    setIsRunningTest(true);
    setTestResults(null);

    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1500));

    const results: TestResult[] = variants.map(variant => ({
      variantId: variant.id,
      score: 0.7 + Math.random() * 0.25,
      latency: 200 + Math.random() * 400,
    }));

    setTestResults(results);
    setIsRunningTest(false);
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
            onOpenConfig={() => setDrawerOpen(true)}
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

      <ConfigDrawer
        isOpen={drawerOpen}
        activeTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        onTabChange={setDrawerTab}
        configs={configs}
        selectedConfigId={selectedConfigId}
        configName={configName}
        provider={provider}
        model={model}
        instructions={instructions}
        temperature={temperature}
        tools={tools}
        configCommitMsg={configCommitMsg}
        currentContent={currentContent}
        onConfigNameChange={setConfigName}
        onProviderChange={setProvider}
        onModelChange={setModel}
        onInstructionsChange={setInstructions}
        onTemperatureChange={setTemperature}
        onToolsChange={setTools}
        onConfigCommitMsgChange={setConfigCommitMsg}
        onSaveConfig={saveConfig}
        onLoadConfig={loadConfig}
        onUseCurrentPrompt={useCurrentPrompt}
        variants={variants}
        testInput={testInput}
        testResults={testResults}
        isRunningTest={isRunningTest}
        commits={commits}
        onVariantsChange={setVariants}
        onTestInputChange={setTestInput}
        onRunTest={runABTest}
      />
    </div>
  );
}
