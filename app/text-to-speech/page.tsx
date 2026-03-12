/**
 * Text-to-Speech Evaluation Page
 *
 * Tab 1 - Datasets: Create datasets with text samples
 * Tab 2 - Evaluations: Run and monitor TTS evaluations
 */

"use client"
import { useState, useEffect, useRef } from 'react';
import { colors } from '@/app/lib/colors';
import Sidebar from '@/app/components/Sidebar';
import TabNavigation from '@/app/components/TabNavigation';
import StatusBadge from '@/app/components/StatusBadge';
import Loader, { LoaderBox } from '@/app/components/Loader';
import { useToast } from '@/app/components/Toast';
import { APIKey, STORAGE_KEY } from '@/app/keystore/page';
import ErrorModal from '@/app/components/ErrorModal';

type Tab = 'datasets' | 'evaluations';

// Types
interface TextSample {
  id: string;
  text: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

const DEFAULT_LANGUAGES: Language[] = [
  { id: 1, code: 'en', name: 'English' },
  { id: 2, code: 'hi', name: 'Hindi' },
];

interface TTSDataset {
  id: number;
  name: string;
  description?: string;
  type: string;
  object_store_url: string | null;
  dataset_metadata: {
    sample_count?: number;
    [key: string]: any;
  };
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

interface TTSRun {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  type: string;
  models: string[] | null;
  status: string;
  total_items: number;
  score: {
    [key: string]: any;
  } | null;
  error_message: string | null;
  run_metadata: {
    voice_name?: string;
    style_prompt?: string;
    [key: string]: any;
  } | null;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

interface TTSResult {
  id: number;
  sample_text: string;
  object_store_url: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  provider: string;
  status: string;
  score: {
    [key: string]: any;
  } | null;
  is_correct: boolean | null;
  comment: string | null;
  error_message: string | null;
  evaluation_run_id: number;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
  signedUrl?: string; // Enriched field - signed URL for audio playback
}

// Audio Player Component for URL-based playback
function AudioPlayerFromUrl({
  signedUrl,
  isPlaying,
  onPlayToggle,
  sampleLabel,
  durationSeconds,
  sizeBytes,
}: {
  signedUrl: string;
  isPlaying: boolean;
  onPlayToggle: () => void;
  sampleLabel?: string;
  durationSeconds?: number | null;
  sizeBytes?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => onPlayToggle();

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPlayToggle]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <audio ref={audioRef} src={signedUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={onPlayToggle}
          className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 border-2"
          style={{
            borderColor: colors.accent.primary,
            backgroundColor: 'transparent',
            color: colors.accent.primary,
          }}
        >
          {isPlaying ? (
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="7" y="5" width="3" height="14" />
              <rect x="14" y="5" width="3" height="14" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {sampleLabel && (
          <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
            {sampleLabel}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden mt-2"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            backgroundColor: colors.accent.primary,
            transition: 'width 0.05s ease-out',
          }}
        />
      </div>

      {/* Meta info */}
      {(durationSeconds != null || sizeBytes != null) && (
        <div className="flex items-center gap-3 mt-1.5">
          {durationSeconds != null && (
            <span className="text-xs tabular-nums" style={{ color: colors.text.secondary }}>
              {durationSeconds >= 60
                ? `${Math.floor(durationSeconds / 60)}m ${Math.round(durationSeconds % 60)}s`
                : `${Math.round(durationSeconds)}s`}
            </span>
          )}
          {sizeBytes != null && (
            <span className="text-xs tabular-nums" style={{ color: colors.text.secondary }}>
              {formatSize(sizeBytes)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function TextToSpeechPage() {
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('datasets');

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const leftPanelWidth = 450;

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);

  // Languages
  const [languages, setLanguages] = useState<Language[]>([]);

  // Dataset form (Tab 1)
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetLanguageId, setDatasetLanguageId] = useState<number>(1);
  const [textSamples, setTextSamples] = useState<TextSample[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Datasets list (both tabs)
  const [datasets, setDatasets] = useState<TTSDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  // Evaluation form (Tab 2)
  const [evaluationName, setEvaluationName] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro-preview-tts');
  const [isRunning, setIsRunning] = useState(false);

  // Evaluation runs (Tab 2)
  const [runs, setRuns] = useState<TTSRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  // Result viewing
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [results, setResults] = useState<TTSResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Error modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Load API keys
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setApiKeys(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Load languages
  const loadLanguages = async () => {
    if (apiKeys.length === 0) return;

    try {
      const response = await fetch('/api/languages', {
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!response.ok) throw new Error('Failed to load languages');

      const data = await response.json();

      let rawList: any[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data.data?.data && Array.isArray(data.data.data)) {
        rawList = data.data.data;
      } else if (data.data && Array.isArray(data.data)) {
        rawList = data.data;
      } else if (data.languages && Array.isArray(data.languages)) {
        rawList = data.languages;
      }

      const languagesList: Language[] = rawList
        .filter((l: any) => l.is_active !== false)
        .map((l: any) => ({
          id: l.id,
          code: l.locale || l.code || '',
          name: l.label || l.name || '',
        }));

      if (languagesList.length > 0) {
        setLanguages(languagesList);
        if (languagesList[0]?.id) {
          setDatasetLanguageId(languagesList[0].id);
        }
      } else {
        setLanguages(DEFAULT_LANGUAGES);
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
      setLanguages(DEFAULT_LANGUAGES);
    }
  };

  // Load datasets
  const loadDatasets = async () => {
    if (apiKeys.length === 0) return;

    setIsLoadingDatasets(true);
    try {
      const response = await fetch('/api/evaluations/tts/datasets', {
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!response.ok) throw new Error('Failed to load datasets');

      const data = await response.json();

      let datasetsList = [];
      if (Array.isArray(data)) {
        datasetsList = data;
      } else if (data.datasets && Array.isArray(data.datasets)) {
        datasetsList = data.datasets;
      } else if (data.data && Array.isArray(data.data)) {
        datasetsList = data.data;
      }

      setDatasets(datasetsList);
    } catch (error) {
      console.error('Failed to load datasets:', error);
      toast.error('Failed to load datasets');
      setDatasets([]);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Load evaluation runs
  const loadRuns = async () => {
    if (apiKeys.length === 0) return;

    setIsLoadingRuns(true);
    try {
      const response = await fetch('/api/evaluations/tts/runs', {
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!response.ok) throw new Error('Failed to load runs');

      const data = await response.json();

      let runsList = [];
      if (Array.isArray(data)) {
        runsList = data;
      } else if (data.runs && Array.isArray(data.runs)) {
        runsList = data.runs;
      } else if (data.data && Array.isArray(data.data)) {
        runsList = data.data;
      }

      setRuns(runsList);
    } catch (error) {
      console.error('Failed to load runs:', error);
      toast.error('Failed to load evaluation runs');
      setRuns([]);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  useEffect(() => {
    loadLanguages();
    loadDatasets();
    if (activeTab === 'evaluations') {
      loadRuns();
    }
  }, [apiKeys, activeTab]);

  // Auto-refresh runs every 10 seconds if there are running evaluations
  useEffect(() => {
    if (activeTab !== 'evaluations') return;

    const hasRunningEvals = runs.some(run =>
      run.status === 'running' || run.status === 'processing' || run.status === 'pending'
    );

    if (hasRunningEvals) {
      const interval = setInterval(() => {
        loadRuns();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [runs, activeTab]);

  // Add a new text sample
  const addTextSample = () => {
    setTextSamples(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      text: '',
    }]);
  };

  // Remove a text sample
  const removeTextSample = (id: string) => {
    setTextSamples(prev => prev.filter(s => s.id !== id));
  };

  // Update text sample text
  const updateSampleText = (id: string, text: string) => {
    setTextSamples(prev => prev.map(s =>
      s.id === id ? { ...s, text } : s
    ));
  };

  // Create dataset
  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    const validSamples = textSamples.filter(s => s.text.trim());
    if (validSamples.length === 0) {
      toast.error('Please add at least one text sample');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setIsCreating(true);

    try {
      const samples = validSamples.map(sample => ({
        text: sample.text.trim(),
      }));

      const response = await fetch('/api/evaluations/tts/datasets', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: datasetName.trim(),
          description: datasetDescription.trim() || undefined,
          language_id: datasetLanguageId,
          samples,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to create dataset';
        throw new Error(errorMessage);
      }

      await response.json();

      toast.success(`Dataset "${datasetName}" created successfully!`);

      setDatasetName('');
      setDatasetDescription('');
      setTextSamples([]);

      await loadDatasets();
    } catch (error) {
      console.error('Failed to create dataset:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while creating the dataset';
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
    } finally {
      setIsCreating(false);
    }
  };

  // Run evaluation
  const handleRunEvaluation = async () => {
    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    if (!selectedDatasetId) {
      toast.error('Please select a dataset');
      return;
    }

    if (!evaluationName.trim()) {
      toast.error('Please enter an evaluation name');
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch('/api/evaluations/tts/runs', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_name: evaluationName.trim(),
          dataset_id: selectedDatasetId,
          models: [selectedModel],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to start evaluation';
        throw new Error(errorMessage);
      }

      await response.json();

      setEvaluationName('');
      setSelectedDatasetId(null);

      await loadRuns();
    } catch (error) {
      console.error('Failed to run evaluation:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while starting the evaluation';
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  };

  // Load results for a specific run
  const loadResults = async (runId: number) => {
    if (apiKeys.length === 0) return;

    setIsLoadingResults(true);
    try {
      const runResponse = await fetch(`/api/evaluations/tts/runs/${runId}?include_results=true&include_signed_url=true`, {
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!runResponse.ok) throw new Error('Failed to load results');

      const runData = await runResponse.json();

      let resultsList = [];
      if (Array.isArray(runData)) {
        resultsList = runData;
      } else if (runData.results && Array.isArray(runData.results)) {
        resultsList = runData.results;
      } else if (runData.data && Array.isArray(runData.data)) {
        resultsList = runData.data;
      } else if (runData.data && runData.data.results && Array.isArray(runData.data.results)) {
        resultsList = runData.data.results;
      }

      // Enrich results with signed URL for audio playback
      resultsList = resultsList.map((result: any) => {
        const signedUrl = result.signed_url || result.sample?.signed_url || '';
        return {
          ...result,
          signedUrl,
        };
      });

      setResults(resultsList);
      setSelectedRunId(runId);
    } catch (error) {
      console.error('Failed to load results:', error);
      toast.error('Failed to load evaluation results');
      setResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/text-to-speech" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-semibold" style={{ color: colors.text.primary }}>
                  Text-to-Speech Evaluation
                </h1>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Compare synthesized audio quality across TTS models
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: 'datasets', label: 'Datasets' },
              { id: 'evaluations', label: 'Evaluations' },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

          {/* Tab Content */}
          {activeTab === 'datasets' ? (
            <DatasetsTab
              datasetName={datasetName}
              setDatasetName={setDatasetName}
              datasetDescription={datasetDescription}
              setDatasetDescription={setDatasetDescription}
              datasetLanguageId={datasetLanguageId}
              setDatasetLanguageId={setDatasetLanguageId}
              languages={languages}
              textSamples={textSamples}
              addTextSample={addTextSample}
              removeTextSample={removeTextSample}
              updateSampleText={updateSampleText}
              isCreating={isCreating}
              handleCreateDataset={handleCreateDataset}
              resetForm={() => {
                setDatasetName('');
                setDatasetDescription('');
                setTextSamples([]);
              }}
              apiKeys={apiKeys}
            />
          ) : (
            <EvaluationsTab
              leftPanelWidth={leftPanelWidth}
              evaluationName={evaluationName}
              setEvaluationName={setEvaluationName}
              datasets={datasets}
              isLoadingDatasets={isLoadingDatasets}
              selectedDatasetId={selectedDatasetId}
              setSelectedDatasetId={setSelectedDatasetId}
              selectedDataset={selectedDataset}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              isRunning={isRunning}
              handleRunEvaluation={handleRunEvaluation}
              runs={runs}
              isLoadingRuns={isLoadingRuns}
              loadRuns={loadRuns}
              selectedRunId={selectedRunId}
              setSelectedRunId={setSelectedRunId}
              results={results}
              setResults={setResults}
              isLoadingResults={isLoadingResults}
              loadResults={loadResults}
              apiKeys={apiKeys}
              toast={toast}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Error"
        message={errorModalMessage}
      />
    </div>
  );
}

// ============ DATASETS TAB COMPONENT ============
interface DatasetsTabProps {
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguageId: number;
  setDatasetLanguageId: (id: number) => void;
  languages: Language[];
  textSamples: TextSample[];
  addTextSample: () => void;
  removeTextSample: (id: string) => void;
  updateSampleText: (id: string, text: string) => void;
  isCreating: boolean;
  handleCreateDataset: () => void;
  resetForm: () => void;
  apiKeys: APIKey[];
}

function DatasetsTab({
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  datasetLanguageId,
  setDatasetLanguageId,
  languages,
  textSamples,
  addTextSample,
  removeTextSample,
  updateSampleText,
  isCreating,
  handleCreateDataset,
  resetForm,
  apiKeys,
}: DatasetsTabProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page Title */}
          <div>
            <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
              Create New Dataset
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
              Add text samples that will be synthesized into speech during evaluation
            </p>
          </div>

          {/* Dataset Fields */}
          <div
            className="rounded-lg p-5"
            style={{
              backgroundColor: colors.bg.primary,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="e.g., Hindi News Dataset"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                  Description
                </label>
                <input
                  type="text"
                  value={datasetDescription}
                  onChange={e => setDatasetDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                  Language *
                </label>
                <select
                  value={datasetLanguageId}
                  onChange={e => setDatasetLanguageId(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                >
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Text Samples Section */}
          <div
            className="rounded-lg flex flex-col overflow-hidden"
            style={{
              backgroundColor: colors.bg.primary,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              ...(textSamples.length > 0 && { flex: 1, minHeight: '400px' }),
            }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text.secondary }}>
                Text Samples *
              </h2>
              <button
                onClick={apiKeys.length > 0 ? addTextSample : undefined}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{
                  color: apiKeys.length > 0 ? colors.accent.primary : colors.text.secondary,
                  cursor: apiKeys.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Sample
              </button>
            </div>

            {textSamples.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm" style={{ color: colors.text.secondary }}>
                  {apiKeys.length > 0 ? 'No samples added yet. Use the "Add Sample" button above.' : 'Add an API key in Keystore first.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-3">
                  {textSamples.map((sample, idx) => (
                    <div
                      key={sample.id}
                      className="border rounded-lg overflow-hidden"
                      style={{
                        borderColor: sample.text.trim() ? colors.status.success : colors.border,
                        backgroundColor: sample.text.trim() ? 'rgba(22, 163, 74, 0.02)' : colors.bg.secondary,
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium"
                              style={{ backgroundColor: colors.bg.primary, color: colors.text.secondary }}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                              Sample {idx + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => removeTextSample(sample.id)}
                            className="p-1 rounded flex-shrink-0"
                            style={{ color: colors.text.secondary }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <textarea
                          value={sample.text}
                          onChange={e => updateSampleText(sample.id, e.target.value)}
                          placeholder="Enter text to be synthesized into speech..."
                          rows={3}
                          className="w-full px-3 py-2 border rounded text-sm"
                          style={{
                            backgroundColor: colors.bg.primary,
                            borderColor: colors.border,
                            color: colors.text.primary,
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Fixed Action Buttons at Bottom */}
      <div
        className="flex-shrink-0 border-t px-6 py-4 flex gap-3"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.bg.primary,
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)'
        }}
      >
        <button
          onClick={resetForm}
          disabled={isCreating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border"
          style={{
            backgroundColor: colors.bg.primary,
            borderColor: colors.border,
            color: colors.text.primary,
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateDataset}
          disabled={isCreating || !datasetName.trim() || textSamples.filter(s => s.text.trim()).length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: isCreating || !datasetName.trim() || textSamples.filter(s => s.text.trim()).length === 0
              ? colors.bg.secondary
              : colors.accent.primary,
            color: isCreating || !datasetName.trim() || textSamples.filter(s => s.text.trim()).length === 0
              ? colors.text.secondary
              : '#fff',
            cursor: isCreating || !datasetName.trim() || textSamples.filter(s => s.text.trim()).length === 0
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
              Creating Dataset...
            </>
          ) : (
            'Create Dataset'
          )}
        </button>
      </div>
    </div>
  );
}

// ============ EVALUATIONS TAB COMPONENT ============
interface EvaluationsTabProps {
  leftPanelWidth: number;
  evaluationName: string;
  setEvaluationName: (name: string) => void;
  datasets: TTSDataset[];
  isLoadingDatasets: boolean;
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  selectedDataset: TTSDataset | undefined;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
  runs: TTSRun[];
  isLoadingRuns: boolean;
  loadRuns: () => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: TTSResult[];
  setResults: React.Dispatch<React.SetStateAction<TTSResult[]>>;
  isLoadingResults: boolean;
  loadResults: (runId: number) => void;
  apiKeys: APIKey[];
  toast: any;
  setActiveTab: (tab: Tab) => void;
}

function EvaluationsTab({
  leftPanelWidth,
  evaluationName,
  setEvaluationName,
  datasets,
  isLoadingDatasets,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedDataset,
  selectedModel,
  setSelectedModel,
  isRunning,
  handleRunEvaluation,
  runs,
  isLoadingRuns,
  loadRuns,
  selectedRunId,
  setSelectedRunId,
  results,
  setResults,
  isLoadingResults,
  loadResults,
  apiKeys,
  toast,
  setActiveTab,
}: EvaluationsTabProps) {
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);
  const [openScoreInfo, setOpenScoreInfo] = useState<string | null>(null);
  const [scoreInfoPos, setScoreInfoPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Close score info tooltip on outside click or scroll
  useEffect(() => {
    if (!openScoreInfo) return;
    const handleClose = () => setOpenScoreInfo(null);
    document.addEventListener('click', handleClose);
    document.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('scroll', handleClose, true);
    };
  }, [openScoreInfo]);

  const updateFeedback = async (resultId: number, isCorrect: boolean | null, comment?: string, score?: { [key: string]: any }) => {
    if (apiKeys.length === 0) return;

    try {
      const payload: { is_correct?: boolean | null; comment?: string; score?: { [key: string]: any } } = {};
      if (isCorrect !== undefined) payload.is_correct = isCorrect;
      if (comment !== undefined) payload.comment = comment;
      if (score !== undefined) payload.score = score;

      const response = await fetch(`/api/evaluations/tts/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update feedback');

      setResults(prev => prev.map(r =>
        r.id === resultId ? {
          ...r,
          ...(isCorrect !== undefined ? { is_correct: isCorrect } : {}),
          ...(comment !== undefined && { comment }),
          ...(score !== undefined && { score: { ...(r.score || {}), ...score } }),
        } : r
      ));
    } catch (error) {
      console.error('Failed to update feedback:', error);
      toast.error('Failed to update feedback');
    }
  };


  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Evaluation Configuration */}
      {selectedRunId === null && (
        <div
          className="flex-shrink-0 border-r flex flex-col overflow-hidden"
          style={{
            width: `${leftPanelWidth}px`,
            backgroundColor: colors.bg.primary,
            borderColor: colors.border,
          }}
        >
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Evaluation Name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                Name *
              </label>
              <input
                type="text"
                value={evaluationName}
                onChange={e => setEvaluationName(e.target.value)}
                placeholder="e.g., Hindi TTS Evaluation v1"
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                Model *
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              >
                <option value="gemini-2.5-pro-preview-tts">gemini-2.5-pro-preview-tts</option>
              </select>
            </div>

            {/* Dataset Selection */}
            <div className="pt-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                Select Dataset *
              </label>
              {isLoadingDatasets ? (
                <LoaderBox message="Loading datasets..." size="sm" />
              ) : datasets.length === 0 ? (
                <div className="border rounded-md p-8 text-center" style={{ borderColor: colors.border }}>
                  <p className="text-sm" style={{ color: colors.text.secondary }}>No datasets available</p>
                  <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                    Create a dataset first in the Datasets tab
                  </p>
                </div>
              ) : (
                <select
                  value={selectedDatasetId || ''}
                  onChange={e => setSelectedDatasetId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                >
                  <option value="">-- Select a dataset --</option>
                  {datasets.map(dataset => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} ({dataset.dataset_metadata?.sample_count || 0} samples)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Dataset Info */}
            {selectedDataset && (
              <div
                className="border rounded-lg p-3"
                style={{
                  borderColor: colors.status.success,
                  backgroundColor: 'rgba(22, 163, 74, 0.02)',
                }}
              >
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.success }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                      {selectedDataset.name}
                    </div>
                    <div className="text-xs mt-1 space-y-0.5" style={{ color: colors.text.secondary }}>
                      <div>{selectedDataset.dataset_metadata?.sample_count || 0} samples</div>
                      {selectedDataset.description && <div>{selectedDataset.description}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Run Evaluation Button */}
          <div
            className="flex-shrink-0 border-t px-4 py-3"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}
          >
            <button
              onClick={handleRunEvaluation}
              disabled={isRunning || !evaluationName.trim() || !selectedDatasetId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: isRunning || !evaluationName.trim() || !selectedDatasetId
                  ? colors.bg.secondary
                  : colors.accent.primary,
                color: isRunning || !evaluationName.trim() || !selectedDatasetId
                  ? colors.text.secondary
                  : '#fff',
                cursor: isRunning || !evaluationName.trim() || !selectedDatasetId
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                  Starting Evaluation...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run Evaluation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Right Panel - Evaluation Runs List or Results */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              {selectedRunId !== null ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRunId(null)}
                    className="p-1 rounded"
                    style={{ color: colors.text.secondary }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
                    {runs.find(r => r.id === selectedRunId)?.run_name}
                  </h2>
                </div>
              ) : (
                <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
                  Evaluation Runs
                </h2>
              )}
            </div>
            {selectedRunId === null && (
              <button
                onClick={loadRuns}
                disabled={isLoadingRuns}
                className="p-1.5 rounded"
                style={{ color: colors.text.secondary }}
              >
                <svg
                  className={`w-4 h-4 ${isLoadingRuns ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>

          <div className="rounded-lg overflow-visible" style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            {selectedRunId !== null ? (
              // Results View
              isLoadingResults ? (
                <div className="p-16">
                  <Loader size="md" message="Loading results..." />
                </div>
              ) : results.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>No results found</p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>This evaluation has no results yet</p>
                </div>
              ) : (
                <table className="w-full" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.bg.secondary, borderBottom: `1px solid ${colors.border}` }}>
                      <th className="text-left px-4 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '24%' }}>Text</th>
                      <th className="text-left px-4 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '18%' }}>Audio</th>
                      <th className="text-left px-3 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '12%' }}>
                        <div>
                          <div>Speech</div>
                          <div>Naturalness{' '}
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle"
                            style={{ backgroundColor: colors.bg.primary, border: `1px solid ${colors.border}`, color: colors.text.secondary }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setScoreInfoPos({ top: rect.bottom + 4, left: rect.left });
                              setOpenScoreInfo(openScoreInfo === 'speech_naturalness' ? null : 'speech_naturalness');
                            }}
                          >
                            i
                          </span>
                          {openScoreInfo === 'speech_naturalness' && (
                            <div
                              className="fixed z-50 rounded-lg shadow-lg border text-xs"
                              style={{ backgroundColor: colors.bg.primary, borderColor: colors.border, width: '340px', top: scoreInfoPos.top, left: scoreInfoPos.left }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-3">
                                <div className="font-semibold mb-2" style={{ color: colors.text.primary }}>Speech Naturalness</div>
                                <p className="mb-3" style={{ color: colors.text.secondary, fontFamily: 'system-ui, sans-serif' }}>
                                  Assesses how human-like the generated speech sounds.
                                </p>
                                <div className="mb-1 font-semibold" style={{ color: colors.text.primary }}>Scoring</div>
                                <div className="space-y-2 p-2 rounded" style={{ backgroundColor: colors.bg.secondary }}>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: colors.status.success, width: '62px' }}>High:</span>
                                    <span style={{ color: colors.text.primary }}>Very human-like, natural flow with appropriate pauses and inflections.</span>
                                  </div>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: '#ca8a04', width: '62px' }}>Medium:</span>
                                    <span style={{ color: colors.text.primary }}>Some human qualities but with occasional robotic or awkward elements.</span>
                                  </div>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: colors.status.error, width: '62px' }}>Low:</span>
                                    <span style={{ color: colors.text.primary }}>Clearly robotic or artificial, with choppy or monotone speech.</span>
                                  </div>
                                </div>
                                <div className="mt-2 font-semibold" style={{ color: colors.status.success }}>Higher is better.</div>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '12%' }}>
                        <div>
                          <div>Pronunciation</div>
                          <div>Accuracy{' '}
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle"
                            style={{ backgroundColor: colors.bg.primary, border: `1px solid ${colors.border}`, color: colors.text.secondary }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setScoreInfoPos({ top: rect.bottom + 4, left: rect.left });
                              setOpenScoreInfo(openScoreInfo === 'pronunciation_accuracy' ? null : 'pronunciation_accuracy');
                            }}
                          >
                            i
                          </span>
                          {openScoreInfo === 'pronunciation_accuracy' && (
                            <div
                              className="fixed z-50 rounded-lg shadow-lg border text-xs"
                              style={{ backgroundColor: colors.bg.primary, borderColor: colors.border, width: '340px', top: scoreInfoPos.top, left: scoreInfoPos.left }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-3">
                                <div className="font-semibold mb-2" style={{ color: colors.text.primary }}>Pronunciation Accuracy</div>
                                <p className="mb-3" style={{ color: colors.text.secondary, fontFamily: 'system-ui, sans-serif' }}>
                                  Evaluates how clearly and correctly words are pronounced in the TTS output.
                                </p>
                                <div className="mb-1 font-semibold" style={{ color: colors.text.primary }}>Scoring</div>
                                <div className="space-y-2 p-2 rounded" style={{ backgroundColor: colors.bg.secondary }}>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: colors.status.success, width: '62px' }}>High:</span>
                                    <span style={{ color: colors.text.primary }}>All words are pronounced clearly and correctly.</span>
                                  </div>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: '#ca8a04', width: '62px' }}>Medium:</span>
                                    <span style={{ color: colors.text.primary }}>1-2 words are mispronounced or unclear.</span>
                                  </div>
                                  <div className="flex">
                                    <span className="font-semibold shrink-0" style={{ color: colors.status.error, width: '62px' }}>Low:</span>
                                    <span style={{ color: colors.text.primary }}>3 or more words are mispronounced or difficult to understand.</span>
                                  </div>
                                </div>
                                <div className="mt-2 font-semibold" style={{ color: colors.status.success }}>Higher is better.</div>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '12%' }}>Is Correct</th>
                      <th className="text-left px-4 py-3 text-xs font-medium align-top" style={{ color: colors.text.secondary, width: '18%' }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => {
                      return (
                        <tr key={result.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td className="px-4 py-3 text-sm align-top" style={{ color: colors.text.primary }}>
                            <div
                              className="overflow-y-auto"
                              style={{
                                maxHeight: '80px',
                                lineHeight: '1.5',
                              }}
                            >
                              {result.sample_text || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm align-top">
                            {result.signedUrl ? (
                              <AudioPlayerFromUrl
                                signedUrl={result.signedUrl}
                                isPlaying={playingResultId === result.id}
                                onPlayToggle={() => setPlayingResultId(playingResultId === result.id ? null : result.id)}
                                sampleLabel={`Sample ${idx + 1}`}
                                durationSeconds={result.duration_seconds}
                                sizeBytes={result.size_bytes}
                              />
                            ) : (
                              <span className="text-xs" style={{ color: colors.text.secondary }}>
                                {result.status === 'SUCCESS' ? 'No audio available' : '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm align-top">
                            <select
                              value={result.score?.speech_naturalness || ''}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                const newScore = { ...(result.score || {}), speech_naturalness: value };
                                setResults(prev => prev.map(r =>
                                  r.id === result.id ? { ...r, score: newScore } : r
                                ));
                                updateFeedback(result.id, result.is_correct, undefined, { speech_naturalness: value });
                              }}
                              disabled={result.status !== 'SUCCESS'}
                              className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                              style={{
                                backgroundColor: !result.score?.speech_naturalness
                                  ? colors.bg.primary
                                  : result.score.speech_naturalness === 'High'
                                    ? 'rgba(22, 163, 74, 0.1)'
                                    : result.score.speech_naturalness === 'Medium'
                                      ? 'rgba(234, 179, 8, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                borderColor: !result.score?.speech_naturalness
                                  ? colors.border
                                  : result.score.speech_naturalness === 'High'
                                    ? colors.status.success
                                    : result.score.speech_naturalness === 'Medium'
                                      ? '#eab308'
                                      : colors.status.error,
                                color: !result.score?.speech_naturalness
                                  ? colors.text.primary
                                  : result.score.speech_naturalness === 'High'
                                    ? colors.status.success
                                    : result.score.speech_naturalness === 'Medium'
                                      ? '#ca8a04'
                                      : colors.status.error,
                                cursor: result.status === 'SUCCESS' ? 'pointer' : 'not-allowed',
                                opacity: result.status === 'SUCCESS' ? 1 : 0.5,
                              }}
                            >
                              <option value="">-</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-sm align-top">
                            <select
                              value={result.score?.pronunciation_accuracy || ''}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                const newScore = { ...(result.score || {}), pronunciation_accuracy: value };
                                setResults(prev => prev.map(r =>
                                  r.id === result.id ? { ...r, score: newScore } : r
                                ));
                                updateFeedback(result.id, result.is_correct, undefined, { pronunciation_accuracy: value });
                              }}
                              disabled={result.status !== 'SUCCESS'}
                              className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                              style={{
                                backgroundColor: !result.score?.pronunciation_accuracy
                                  ? colors.bg.primary
                                  : result.score.pronunciation_accuracy === 'High'
                                    ? 'rgba(22, 163, 74, 0.1)'
                                    : result.score.pronunciation_accuracy === 'Medium'
                                      ? 'rgba(234, 179, 8, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                borderColor: !result.score?.pronunciation_accuracy
                                  ? colors.border
                                  : result.score.pronunciation_accuracy === 'High'
                                    ? colors.status.success
                                    : result.score.pronunciation_accuracy === 'Medium'
                                      ? '#eab308'
                                      : colors.status.error,
                                color: !result.score?.pronunciation_accuracy
                                  ? colors.text.primary
                                  : result.score.pronunciation_accuracy === 'High'
                                    ? colors.status.success
                                    : result.score.pronunciation_accuracy === 'Medium'
                                      ? '#ca8a04'
                                      : colors.status.error,
                                cursor: result.status === 'SUCCESS' ? 'pointer' : 'not-allowed',
                                opacity: result.status === 'SUCCESS' ? 1 : 0.5,
                              }}
                            >
                              <option value="">-</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-sm align-top">
                            <select
                              value={result.is_correct === null ? '' : result.is_correct ? 'true' : 'false'}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateFeedback(result.id, value === '' ? null : value === 'true');
                              }}
                              disabled={result.status !== 'SUCCESS'}
                              className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                              style={{
                                backgroundColor: result.is_correct === null
                                  ? colors.bg.primary
                                  : result.is_correct
                                    ? 'rgba(22, 163, 74, 0.1)'
                                    : 'rgba(239, 68, 68, 0.1)',
                                borderColor: result.is_correct === null
                                  ? colors.border
                                  : result.is_correct
                                    ? colors.status.success
                                    : colors.status.error,
                                color: result.is_correct === null
                                  ? colors.text.primary
                                  : result.is_correct
                                    ? colors.status.success
                                    : colors.status.error,
                                cursor: result.status === 'SUCCESS' ? 'pointer' : 'not-allowed',
                                opacity: result.status === 'SUCCESS' ? 1 : 0.5,
                              }}
                            >
                              <option value="">-</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm align-top">
                            <textarea
                              value={result.comment || ''}
                              onChange={(e) => {
                                setResults(prev => prev.map(r =>
                                  r.id === result.id ? { ...r, comment: e.target.value } : r
                                ));
                              }}
                              onBlur={(e) => {
                                if (result.status === 'SUCCESS') {
                                  updateFeedback(result.id, result.is_correct, e.target.value);
                                }
                              }}
                              placeholder="Add comment..."
                              rows={2}
                              disabled={result.status !== 'SUCCESS'}
                              className="w-full px-2 py-1.5 border rounded text-xs"
                              style={{
                                backgroundColor: colors.bg.primary,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                resize: 'vertical',
                                opacity: result.status === 'SUCCESS' ? 1 : 0.5,
                                cursor: result.status === 'SUCCESS' ? 'text' : 'not-allowed',
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              // Runs List View
              isLoadingRuns ? (
                <div className="p-16">
                  <Loader size="md" message="Loading evaluation runs..." />
                </div>
              ) : runs.length === 0 ? (
                <div className="p-16 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>No evaluation runs yet</p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Run your first evaluation to get started</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {runs.map((run) => {
                    const isCompleted = run.status.toLowerCase() === 'completed';
                    return (
                      <div
                        key={run.id}
                        className="rounded-lg p-5"
                        style={{
                          backgroundColor: colors.bg.primary,
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="text-base font-medium" style={{ color: colors.text.primary }}>
                              {run.run_name}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 text-sm" style={{ color: colors.text.secondary }}>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3" />
                              </svg>
                              {run.dataset_name}
                            </span>
                            {run.models && run.models.length > 0 && (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bg.secondary }}>
                                {run.models.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={run.status} size="sm" />
                            <button
                              onClick={isCompleted ? () => loadResults(run.id) : undefined}
                              disabled={!isCompleted}
                              className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                              style={{
                                backgroundColor: 'transparent',
                                borderColor: isCompleted ? colors.accent.primary : colors.border,
                                color: isCompleted ? colors.accent.primary : colors.text.secondary,
                                cursor: isCompleted ? 'pointer' : 'not-allowed',
                                opacity: isCompleted ? 1 : 0.5,
                              }}
                            >
                              View Results
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
