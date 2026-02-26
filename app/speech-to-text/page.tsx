/**
 * Speech-to-Text Evaluation Page
 *
 * Tab 1 - Datasets: Create datasets with audio uploads
 * Tab 2 - Evaluations: Run and monitor STT evaluations
 */

"use client"
import { useState, useEffect, useRef } from 'react';
import { colors } from '@/app/lib/colors';
import Sidebar from '@/app/components/Sidebar';
import { useToast } from '@/app/components/Toast';
import { APIKey, STORAGE_KEY } from '@/app/keystore/page';
import WaveformVisualizer from '@/app/components/speech-to-text/WaveformVisualizer';
import { formatDate } from '@/app/components/utils';
import ErrorModal from '@/app/components/ErrorModal';

type Tab = 'datasets' | 'evaluations';

// Types
interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  base64: string;
  mediaType: string;
  groundTruth: string;
  fileId?: string; // Backend file ID after upload
}

interface Dataset {
  id: number;
  name: string;
  description?: string;
  type: string;
  language_id: number | null;
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

interface STTRun {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  type: string;
  language_id: number | null;
  models: string[] | null;
  status: string;
  total_items: number;
  score: {
    [key: string]: any;
  } | null;
  error_message: string | null;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

interface STTResult {
  id: number;
  transcription: string | null;
  provider: string;
  status: string;
  score: {
    [key: string]: any;
  } | null;
  is_correct: boolean | null;
  comment: string | null;
  error_message: string | null;
  stt_sample_id: number;
  evaluation_run_id: number;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
  sampleName?: string; // Enriched field
  groundTruth?: string; // Enriched field
}

// Audio Player Component with Waveform
function AudioPlayer({
  audioBase64,
  mediaType,
  isPlaying,
  onPlayToggle,
}: {
  audioBase64: string;
  mediaType: string;
  isPlaying: boolean;
  onPlayToggle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioSrc = `data:${mediaType};base64,${audioBase64}`;

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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-1.5">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="flex items-center gap-2">
        <button
          onClick={onPlayToggle}
          className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            backgroundColor: isPlaying ? colors.accent.primary : colors.bg.secondary,
            color: isPlaying ? '#fff' : colors.text.primary,
          }}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform Visualizer */}
        <div className="flex-1 min-w-0">
          <WaveformVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            height={32}
          />
        </div>

        <span className="text-xs tabular-nums flex-shrink-0" style={{ color: colors.text.secondary }}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            backgroundColor: colors.accent.primary,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
}

// Helper function to map language ID to language name
const getLanguageName = (languageId: number | null): string => {
  const languageMap: Record<number, string> = {
    1: 'English',
    2: 'Hindi',
  };
  return languageId ? languageMap[languageId] || 'Unknown' : 'N/A';
};

// Helper function to map language code to language ID
const getLanguageId = (languageCode: string): number => {
  const languageCodeToIdMap: Record<string, number> = {
    'en': 1, // English
    'hi': 2, // Hindi
  };
  return languageCodeToIdMap[languageCode] || 1; // Default to English if not found
};

// Helper function to format status
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bg: colors.bg.primary, border: colors.status.success, text: colors.status.success };
    case 'failed':
      return { bg: colors.bg.primary, border: colors.status.error, text: colors.status.error };
    case 'running':
    case 'processing':
      return { bg: colors.bg.primary, border: colors.accent.primary, text: colors.accent.primary };
    default:
      return { bg: colors.bg.primary, border: colors.border, text: colors.text.secondary };
  }
};

export default function SpeechToTextPage() {
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('datasets');

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftPanelWidth] = useState(450);

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);

  // Dataset form (Tab 1)
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetLanguage, setDatasetLanguage] = useState('en');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Datasets list (both tabs)
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);

  // Evaluation form (Tab 2)
  const [evaluationName, setEvaluationName] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [isRunning, setIsRunning] = useState(false);

  // Evaluation runs (Tab 2)
  const [runs, setRuns] = useState<STTRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  // Result viewing
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [results, setResults] = useState<STTResult[]>([]);
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

  // Load datasets
  const loadDatasets = async () => {
    if (apiKeys.length === 0) return;

    setIsLoadingDatasets(true);
    try {
      const response = await fetch('/api/evaluations/stt/datasets', {
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
      const response = await fetch('/api/evaluations/stt/runs', {
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

  // Handle audio file selection and upload
  const handleAudioFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    const validTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];

    for (const file of Array.from(files)) {
      if (!validTypes.some(ext => file.name.toLowerCase().endsWith(ext))) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const base64 = await base64Promise;
        const localId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        setAudioFiles(prev => [...prev, {
          id: localId,
          file,
          name: file.name,
          size: file.size,
          base64,
          mediaType: file.type || 'audio/mpeg',
          groundTruth: '',
          fileId: undefined,
        }]);

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/evaluations/stt/files', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKeys[0].key },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`Upload failed with status ${uploadResponse.status}:`, errorText);
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('Backend upload response:', uploadData);

        const backendFileId = uploadData.file_id || uploadData.id || uploadData.data?.file_id || uploadData.data?.id;

        if (!backendFileId) {
          console.error('No file ID found in response. Full response:', JSON.stringify(uploadData, null, 2));
          throw new Error(`No file ID returned from backend. Response: ${JSON.stringify(uploadData)}`);
        }

        setAudioFiles(prev => prev.map(f =>
          f.id === localId ? { ...f, fileId: backendFileId } : f
        ));

        // toast.success(`${file.name} uploaded`); // Removed toast notification
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
        setAudioFiles(prev => prev.filter(f => f.name !== file.name));
      }
    }

    event.target.value = '';
  };

  const triggerAudioUpload = () => {
    const input = document.getElementById('audio-upload') as HTMLInputElement;
    if (input) input.click();
  };

  const removeAudioFile = (id: string) => {
    setAudioFiles(prev => prev.filter(f => f.id !== id));
    if (playingFileId === id) setPlayingFileId(null);
  };

  const updateGroundTruth = (id: string, groundTruth: string) => {
    setAudioFiles(prev => prev.map(f =>
      f.id === id ? { ...f, groundTruth } : f
    ));
  };

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    if (audioFiles.length === 0) {
      toast.error('Please add at least one audio file');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    const filesNotUploaded = audioFiles.filter(f => !f.fileId);
    if (filesNotUploaded.length > 0) {
      toast.error(`${filesNotUploaded.length} file(s) still uploading. Please wait...`);
      return;
    }

    setIsCreating(true);

    try {
      const samples = audioFiles.map(audioFile => ({
        file_id: audioFile.fileId!,
        ground_truth: audioFile.groundTruth.trim() || undefined,
      }));

      const createDatasetResponse = await fetch('/api/evaluations/stt/datasets', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: datasetName.trim(),
          description: datasetDescription.trim() || undefined,
          language_id: 1,
          samples: samples,
        }),
      });

      if (!createDatasetResponse.ok) {
        const errorData = await createDatasetResponse.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to create dataset';
        throw new Error(errorMessage);
      }

      await createDatasetResponse.json();

      toast.success(`Dataset "${datasetName}" created successfully!`);

      setDatasetName('');
      setDatasetDescription('');
      setDatasetLanguage('en');
      setAudioFiles([]);

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
      const response = await fetch('/api/evaluations/stt/runs', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_name: evaluationName.trim(),
          dataset_id: selectedDatasetId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to start evaluation';
        throw new Error(errorMessage);
      }

      await response.json();

     // toast.success(`Evaluation "${evaluationName}" started successfully!`);
      setSelectedModel('gemini-2.5-pro');

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Load results for a specific run
  const loadResults = async (runId: number) => {
    if (apiKeys.length === 0) return;

    setIsLoadingResults(true);
    try {
      // Fetch run details with results
      const runResponse = await fetch(`/api/evaluations/stt/runs/${runId}?include_results=true`, {
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!runResponse.ok) throw new Error('Failed to load results');

      const runData = await runResponse.json();
      console.log('Run API Response:', runData);

      // Extract results
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

      // Get dataset_id from the run
      const datasetId = runData.dataset_id || runData.data?.dataset_id;

      if (datasetId) {
        // Fetch dataset with samples
        const datasetResponse = await fetch(`/api/evaluations/stt/datasets/${datasetId}?include_samples=true`, {
          headers: { 'X-API-KEY': apiKeys[0].key },
        });

        if (datasetResponse.ok) {
          const datasetData = await datasetResponse.json();

          // Extract samples
          let samples = [];
          if (datasetData.samples && Array.isArray(datasetData.samples)) {
            samples = datasetData.samples;
          } else if (datasetData.data && datasetData.data.samples && Array.isArray(datasetData.data.samples)) {
            samples = datasetData.data.samples;
          }

          // Create a map of sample_id to sample data (name and ground truth)
          const sampleMap = new Map();
          samples.forEach((sample: any) => {
            const sampleName = sample.sample_metadata?.original_filename ||
                             sample.metadata?.original_filename ||
                             `Sample ${sample.id}`;
            const groundTruth = sample.ground_truth || sample.sample_metadata?.ground_truth || sample.metadata?.ground_truth || '';

            sampleMap.set(sample.id, { sampleName, groundTruth });
          });

          // Enrich results with sample names and ground truth
          resultsList = resultsList.map((result: any) => {
            const sampleData = sampleMap.get(result.stt_sample_id);
            return {
              ...result,
              sampleName: sampleData?.sampleName || '-',
              groundTruth: sampleData?.groundTruth || ''
            };
          });
        }
      }

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
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/speech-to-text" />

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
                  Speech-to-Text Evaluation
                </h1>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Compare transcription quality across STT models
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            className="border-b flex gap-1 px-4"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            <button
              onClick={() => setActiveTab('datasets')}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'datasets' ? colors.accent.primary : 'transparent',
                color: activeTab === 'datasets' ? colors.accent.primary : colors.text.secondary,
              }}
            >
              Datasets
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === 'evaluations' ? colors.accent.primary : 'transparent',
                color: activeTab === 'evaluations' ? colors.accent.primary : colors.text.secondary,
              }}
            >
              Evaluations
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'datasets' ? (
            <DatasetsTab
              leftPanelWidth={leftPanelWidth}
              datasetName={datasetName}
              setDatasetName={setDatasetName}
              datasetDescription={datasetDescription}
              setDatasetDescription={setDatasetDescription}
              datasetLanguage={datasetLanguage}
              setDatasetLanguage={setDatasetLanguage}
              audioFiles={audioFiles}
              setAudioFiles={setAudioFiles}
              playingFileId={playingFileId}
              setPlayingFileId={setPlayingFileId}
              handleAudioFileSelect={handleAudioFileSelect}
              triggerAudioUpload={triggerAudioUpload}
              removeAudioFile={removeAudioFile}
              updateGroundTruth={updateGroundTruth}
              formatFileSize={formatFileSize}
              isCreating={isCreating}
              handleCreateDataset={handleCreateDataset}
              datasets={datasets}
              isLoadingDatasets={isLoadingDatasets}
              loadDatasets={loadDatasets}
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
  leftPanelWidth: number;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguage: string;
  setDatasetLanguage: (lang: string) => void;
  audioFiles: AudioFile[];
  setAudioFiles: React.Dispatch<React.SetStateAction<AudioFile[]>>;
  playingFileId: string | null;
  setPlayingFileId: (id: string | null) => void;
  handleAudioFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerAudioUpload: () => void;
  removeAudioFile: (id: string) => void;
  updateGroundTruth: (id: string, groundTruth: string) => void;
  formatFileSize: (bytes: number) => string;
  isCreating: boolean;
  handleCreateDataset: () => void;
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  loadDatasets: () => void;
  apiKeys: APIKey[];
}

function DatasetsTab({
  leftPanelWidth,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  datasetLanguage,
  setDatasetLanguage,
  audioFiles,
  setAudioFiles,
  playingFileId,
  setPlayingFileId,
  handleAudioFileSelect,
  triggerAudioUpload,
  removeAudioFile,
  updateGroundTruth,
  formatFileSize,
  isCreating,
  handleCreateDataset,
  datasets,
  isLoadingDatasets,
  loadDatasets,
  apiKeys,
}: DatasetsTabProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Dataset Information Card - Compact */}
          <div
            className="border rounded-lg p-4"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: colors.text.primary }}>
              Dataset Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.primary }}>
                  Dataset Name *
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="e.g., English Podcast Dataset"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.primary }}>
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
            </div>
          </div>

          {/* Audio Files Section Card - Expanded with Split Layout */}
          <div
            className="border rounded-lg flex flex-col overflow-hidden"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
              ...(audioFiles.length > 0 && { flex: 1, minHeight: '500px' }),
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: colors.border }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                Audio Files *
              </h2>
            </div>

            <input
              id="audio-upload"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.flac,.webm"
              multiple
              onChange={handleAudioFileSelect}
              className="hidden"
            />

            {audioFiles.length === 0 ? (
              <div className="p-6">
                <div
                  onClick={apiKeys.length > 0 ? triggerAudioUpload : undefined}
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.primary,
                    cursor: apiKeys.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: apiKeys.length > 0 ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => apiKeys.length > 0 && (e.currentTarget.style.backgroundColor = colors.bg.secondary)}
                  onMouseLeave={(e) => apiKeys.length > 0 && (e.currentTarget.style.backgroundColor = colors.bg.primary)}
                >
                  <svg className="w-10 h-10 mx-auto mb-2" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                    {apiKeys.length > 0 ? 'Click to upload audio files' : 'Add an API key to upload audio files'}
                  </p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    {apiKeys.length > 0 ? 'Supports MP3, WAV, M4A, OGG, FLAC, WebM' : 'Go to Keystore to add an API key first'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden" style={{ minHeight: '500px' }}>
                {/* Left: Upload More Files */}
                <div className="w-96 border-r p-4 flex flex-col" style={{ borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text.primary }}>
                    Upload More Files
                  </h3>
                  <div
                    onClick={apiKeys.length > 0 ? triggerAudioUpload : undefined}
                    className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bg.primary,
                      cursor: apiKeys.length > 0 ? 'pointer' : 'not-allowed',
                      opacity: apiKeys.length > 0 ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => apiKeys.length > 0 && (e.currentTarget.style.backgroundColor = colors.bg.secondary)}
                    onMouseLeave={(e) => apiKeys.length > 0 && (e.currentTarget.style.backgroundColor = colors.bg.primary)}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                      Add Audio Files
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                      MP3, WAV, M4A, OGG, FLAC, WebM
                    </p>
                  </div>
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.bg.secondary }}>
                    <p className="text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
                      Total Files: {audioFiles.length}
                    </p>
                    <p className="text-xs" style={{ color: colors.text.secondary }}>
                      {audioFiles.filter(f => f.fileId).length} uploaded, {audioFiles.filter(f => !f.fileId).length} uploading
                    </p>
                  </div>
                </div>

                {/* Right: Uploaded Files List (Scrollable) */}
                <div className="flex-1 overflow-auto p-4">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text.primary }}>
                    Uploaded Files ({audioFiles.length})
                  </h3>
                  <div className="space-y-3">
                    {audioFiles.map((audioFile, idx) => (
                      <div
                        key={audioFile.id}
                        className="border rounded-lg overflow-hidden"
                        style={{
                          borderColor: audioFile.groundTruth.trim() ? colors.status.success : colors.border,
                          backgroundColor: audioFile.groundTruth.trim() ? 'rgba(22, 163, 74, 0.02)' : colors.bg.secondary,
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
                              <span className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                                {audioFile.name}
                              </span>
                              {audioFile.fileId && (
                                <span
                                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: colors.status.success }}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Uploaded
                                </span>
                              )}
                              {!audioFile.fileId && (
                                <span
                                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: colors.accent.primary }}
                                >
                                  <div className="w-2 h-2 border border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.accent.primary, borderTopColor: 'transparent' }} />
                                  Uploading...
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeAudioFile(audioFile.id)}
                              className="p-1 rounded flex-shrink-0"
                              style={{ color: colors.text.secondary }}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <AudioPlayer
                            audioBase64={audioFile.base64}
                            mediaType={audioFile.mediaType}
                            isPlaying={playingFileId === audioFile.id}
                            onPlayToggle={() => setPlayingFileId(playingFileId === audioFile.id ? null : audioFile.id)}
                          />

                          <div className="mt-3">
                            <label className="block text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                              Ground Truth (optional)
                            </label>
                            <textarea
                              value={audioFile.groundTruth}
                              onChange={e => updateGroundTruth(audioFile.id, e.target.value)}
                              placeholder={audioFile.fileId ? "Enter the expected transcription (optional)..." : "Wait for upload to complete..."}
                              rows={2}
                              disabled={!audioFile.fileId}
                              className="w-full px-2 py-1.5 border rounded text-sm"
                              style={{
                                backgroundColor: audioFile.fileId ? colors.bg.primary : colors.bg.secondary,
                                borderColor: colors.border,
                                color: audioFile.fileId ? colors.text.primary : colors.text.secondary,
                                resize: 'vertical',
                                cursor: audioFile.fileId ? 'text' : 'not-allowed',
                                opacity: audioFile.fileId ? 1 : 0.6,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          onClick={() => {
            setDatasetName('');
            setDatasetDescription('');
            setDatasetLanguage('en');
            setAudioFiles([]);
            setPlayingFileId(null);
          }}
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
          disabled={isCreating || !datasetName.trim() || audioFiles.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: isCreating || !datasetName.trim() || audioFiles.length === 0
              ? colors.bg.secondary
              : colors.accent.primary,
            color: isCreating || !datasetName.trim() || audioFiles.length === 0
              ? colors.text.secondary
              : '#fff',
            cursor: isCreating || !datasetName.trim() || audioFiles.length === 0
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
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  selectedDataset: Dataset | undefined;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
  runs: STTRun[];
  isLoadingRuns: boolean;
  loadRuns: () => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: STTResult[];
  setResults: React.Dispatch<React.SetStateAction<STTResult[]>>;
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
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<number>>(new Set());

  const toggleTranscription = (resultId: number) => {
    setExpandedTranscriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const updateFeedback = async (resultId: number, isCorrect: boolean, comment?: string) => {
    if (apiKeys.length === 0) return;

    try {
      const payload: { is_correct?: boolean; comment?: string } = {};
      if (isCorrect !== undefined) payload.is_correct = isCorrect;
      if (comment !== undefined) payload.comment = comment;

      const response = await fetch(`/api/evaluations/stt/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'X-API-KEY': apiKeys[0].key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update feedback');

      // Update local state
      setResults(prev => prev.map(r =>
        r.id === resultId ? { ...r, ...(isCorrect !== undefined && { is_correct: isCorrect }), ...(comment !== undefined && { comment }) } : r
      ));

   //   toast.success('Feedback updated successfully');
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.primary }}>
              Evaluation Name *
            </label>
            <input
              type="text"
              value={evaluationName}
              onChange={e => setEvaluationName(e.target.value)}
              placeholder="e.g., English Podcast Evaluation v1"
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.primary }}>
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
              <option value="gemini-2.0-flash-exp">gemini-2.5-pro</option>
            </select>
          </div>

          {/* Dataset Selection */}
          <div className="pt-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.primary }}>
              Select Dataset *
            </label>
            {isLoadingDatasets ? (
              <div className="border rounded-md p-8 text-center" style={{ borderColor: colors.border }}>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                <p className="text-xs" style={{ color: colors.text.secondary }}>Loading datasets...</p>
              </div>
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
                    <div>Samples: {selectedDataset.dataset_metadata?.sample_count || 0}</div>
                    {selectedDataset.description && <div>Description: {selectedDataset.description}</div>}
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
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedRunId !== null && (
                <button
                  onClick={() => setSelectedRunId(null)}
                  className="p-1.5 rounded hover:bg-opacity-10"
                  style={{ color: colors.text.secondary }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
                {selectedRunId !== null
                  ? `Results - ${runs.find(r => r.id === selectedRunId)?.run_name}`
                  : 'Evaluation Runs'}
              </h2>
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

          <div className="rounded-lg border overflow-hidden" style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}>
            {selectedRunId !== null ? (
              // Results View
              isLoadingResults ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                  <p className="text-sm" style={{ color: colors.text.secondary }}>Loading results...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>No results found</p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>This evaluation has no results yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: colors.bg.secondary, borderBottom: `1px solid ${colors.border}` }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.text.secondary, width: '15%' }}>Sample</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.text.secondary, width: '20%' }}>Ground Truth</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.text.secondary, width: '25%' }}>Transcription</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.text.secondary, width: '10%' }}>Is Correct</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: colors.text.secondary, width: '30%' }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td className="px-4 py-3 text-sm align-top" style={{ color: colors.text.primary }}>
                          {result.sampleName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm align-top" style={{ color: colors.text.secondary }}>
                          <div
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={result.groundTruth || 'No ground truth provided'}
                          >
                            {result.groundTruth || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm align-top" style={{ color: colors.text.primary }}>
                          <div>
                            <div
                              style={{
                                display: expandedTranscriptions.has(result.id) ? 'block' : '-webkit-box',
                                WebkitLineClamp: expandedTranscriptions.has(result.id) ? 'unset' : 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {result.transcription || '-'}
                            </div>
                            {result.transcription && result.transcription.length > 80 && (
                              <button
                                onClick={() => toggleTranscription(result.id)}
                                className="text-xs mt-1"
                                style={{ color: colors.accent.primary, cursor: 'pointer' }}
                              >
                                {expandedTranscriptions.has(result.id) ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          <select
                            value={result.is_correct === null ? '' : result.is_correct ? 'true' : 'false'}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') return;
                              updateFeedback(result.id, value === 'true');
                            }}
                            className="px-3 py-1.5 border rounded text-xs font-medium"
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
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">-</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          <div className="flex items-start gap-2">
                            <textarea
                              value={result.comment || ''}
                              onChange={(e) => {
                                setResults(prev => prev.map(r =>
                                  r.id === result.id ? { ...r, comment: e.target.value } : r
                                ));
                              }}
                              onBlur={(e) => {
                                updateFeedback(result.id, result.is_correct!, e.target.value);
                              }}
                              placeholder="Add your comment..."
                              rows={2}
                              className="flex-1 px-3 py-2 border rounded text-sm"
                              style={{
                                backgroundColor: colors.bg.primary,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                resize: 'vertical',
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // Runs List View
              isLoadingRuns ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                  <p className="text-sm" style={{ color: colors.text.secondary }}>Loading evaluation runs...</p>
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
                <div className="p-3 space-y-3">
                  {runs.map((run) => {
                    const statusColors = getStatusColor(run.status);
                    const isCompleted = run.status.toLowerCase() === 'completed';
                    return (
                      <div
                        key={run.id}
                        className="border rounded-lg p-5"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.bg.secondary,
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
                          <div className="flex items-center gap-6 text-sm" style={{ color: colors.text.secondary }}>
                            <div>
                              <span className="font-medium">Dataset:</span> {run.dataset_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: statusColors.bg,
                                borderWidth: '1px',
                                borderColor: statusColors.border,
                                color: statusColors.text,
                              }}
                            >
                              {run.status.toUpperCase()}
                            </span>
                            <button
                              onClick={isCompleted ? () => loadResults(run.id) : undefined}
                              disabled={!isCompleted}
                              className="px-4 py-2 rounded-lg text-sm font-medium border"
                              style={{
                                backgroundColor: isCompleted ? colors.bg.primary : colors.bg.secondary,
                                borderColor: colors.border,
                                color: isCompleted ? colors.text.primary : colors.text.secondary,
                                cursor: isCompleted ? 'pointer' : 'not-allowed',
                                opacity: isCompleted ? 1 : 0.6,
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
