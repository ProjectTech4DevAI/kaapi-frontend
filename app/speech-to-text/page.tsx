/**
 * Speech-to-Text Evaluation Page - Redesigned
 *
 * Split-panel workbench layout:
 * - Left Panel: Input configuration (audio files, model selection)
 * - Right Panel: Live results with model comparison cards and diff viewer
 *
 * Features:
 * - Real-time streaming results
 * - Model comparison cards with best performer highlighting
 * - Inline diff viewer for transcription comparison
 * - Floating action bar
 */

"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { colors } from '@/app/lib/colors';
import Sidebar from '@/app/components/Sidebar';
import { useToast } from '@/app/components/Toast';
import { APIKey, STORAGE_KEY } from '@/app/keystore/page';
import ModelComparisonCard from '@/app/components/speech-to-text/ModelComparisonCard';
import TranscriptionDiffViewer from '@/app/components/speech-to-text/TranscriptionDiffViewer';
import WaveformVisualizer from '@/app/components/speech-to-text/WaveformVisualizer';

// Types
interface AudioNerdStats {
  format: string;
  codec: string;
  mimeType: string;
  durationMs: number;
  durationFormatted: string;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  fileSize: number;
  fileSizeFormatted: string;
  base64Length: number;
  compressionRatio: number | null;
}

interface UploadedAudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  base64: string;
  mediaType: string;
  groundTruth: string;
}

interface ParsedRow {
  status: 'success' | 'error';
  row: number;
  audio_url: string;
  ground_truth: string;
  audio_base64?: string;
  media_type?: string;
  file_size?: number;
  error?: string;
}

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
}

interface WerMetrics {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  semantic_errors: number;
  reference_word_count: number;
  hypothesis_word_count: number;
}

interface TranscriptionResult {
  model: string;
  text: string;
  strict?: WerMetrics;
  lenient?: WerMetrics;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

interface EvaluationResult {
  row: number;
  fileId: string;
  audio_url: string;
  ground_truth: string;
  transcriptions: Record<string, TranscriptionResult>;
}

type InputMode = 'single' | 'batch';
type ResultsView = 'cards' | 'table' | 'diff';

// Available STT Models
const STT_MODELS: ModelConfig[] = [
  { id: 'gemini:gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gemini:gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google-stt:chirp_3', name: 'Chirp 3', provider: 'Google' },
  { id: 'openai:gpt-4o-transcribe', name: 'GPT-4o Transcribe', provider: 'OpenAI' },
  { id: 'openai:whisper-1', name: 'Whisper-1', provider: 'OpenAI' },
  { id: 'ai4bharat:indic-conformer-600m-multilingual', name: 'Indic Conformer 600M', provider: 'AI4Bharat' },
];

// Group models by provider
const MODEL_GROUPS = STT_MODELS.reduce((acc, model) => {
  if (!acc[model.provider]) acc[model.provider] = [];
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, ModelConfig[]>);

// Parse model ID
const parseModelId = (modelId: string) => {
  const [provider, model] = modelId.split(':');
  return { provider, model };
};

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

export default function SpeechToTextPage() {
  const toast = useToast();

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(380);
  const [inputMode, setInputMode] = useState<InputMode>('single');
  const [resultsView, setResultsView] = useState<ResultsView>('cards');

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);

  // Single file mode
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAudioFile[]>([]);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);

  // Batch mode
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Model selection
  const [selectedModels, setSelectedModels] = useState<string[]>(['openai:whisper-1']);

  // Processing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [transcriptionProgress, setTranscriptionProgress] = useState({ current: 0, total: 0 });

  // Selected result for diff view
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedModelForDiff, setSelectedModelForDiff] = useState<string | null>(null);

  // Expanded file details in batch mode
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [fileNerdStats, setFileNerdStats] = useState<Map<string, AudioNerdStats>>(new Map());

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

  // Get ready file count
  const readyFileCount = useMemo(() => {
    if (inputMode === 'single') {
      return uploadedFiles.filter(f => f.groundTruth.trim()).length;
    }
    return parsedRows.filter(r => r.status === 'success' && selectedRows.has(r.row)).length;
  }, [inputMode, uploadedFiles, parsedRows, selectedRows]);

  // Find best/worst model for a result
  const getBestWorstModels = useCallback((result: EvaluationResult) => {
    const models = Object.entries(result.transcriptions)
      .filter(([_, t]) => t.status === 'success' && t.strict)
      .map(([id, t]) => ({ id, wer: t.strict!.wer }));

    if (models.length === 0) return { best: null, worst: null };

    const sorted = models.sort((a, b) => a.wer - b.wer);
    return {
      best: sorted[0]?.id || null,
      worst: sorted[sorted.length - 1]?.id || null,
    };
  }, []);

  // Handle file upload
  const handleAudioFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];
    const validFiles = Array.from(files).filter(file =>
      validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
    );

    if (validFiles.length === 0) {
      toast.error('Please select valid audio files (mp3, wav, m4a, ogg, flac, webm)');
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];

        setUploadedFiles(prev => [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          base64,
          mediaType: file.type || 'audio/mpeg',
          groundTruth: '',
        }]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  // Handle CSV upload
  const handleCsvFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setCsvFile(file);
    setParsedRows([]);
    setSelectedRows(new Set());
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/speech-to-text/parse-csv', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKeys[0].key },
        body: formData,
      });

      if (!response.ok) throw new Error(`Failed to parse CSV: ${response.status}`);

      const data = await response.json();
      setParsedRows(data.rows || []);

      const successfulRows = (data.rows || []).filter((r: ParsedRow) => r.status === 'success');
      setSelectedRows(new Set(successfulRows.map((r: ParsedRow) => r.row)));

      toast.success(`Parsed ${successfulRows.length} audio files`);
    } catch (error) {
      toast.error('Failed to parse CSV file');
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle model selection - triggers evaluation for new models if results exist
  const toggleModel = async (modelId: string) => {
    const isAdding = !selectedModels.includes(modelId);

    // Update selection immediately
    setSelectedModels(prev =>
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );

    // If we're adding a model and have existing results, run evaluation for this model
    if (isAdding && evaluationResults.length > 0) {
      await evaluateNewModel(modelId);
    }
  };

  // Evaluate a single new model against existing files
  const evaluateNewModel = async (modelId: string) => {
    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    // Get files from existing results
    const files = evaluationResults.map(result => {
      // Find the original file data
      if (inputMode === 'single') {
        const file = uploadedFiles.find(f => f.id === result.fileId);
        return file ? {
          file_id: result.fileId,
          audio_base64: file.base64,
          ground_truth: result.ground_truth,
        } : null;
      } else {
        const row = parsedRows.find(r => `row-${r.row}` === result.fileId);
        return row ? {
          file_id: result.fileId,
          audio_base64: row.audio_base64 || '',
          ground_truth: result.ground_truth,
        } : null;
      }
    }).filter(Boolean) as { file_id: string; audio_base64: string; ground_truth: string }[];

    if (files.length === 0) return;

    // Add pending state for new model to existing results
    setEvaluationResults(prev => prev.map(result => ({
      ...result,
      transcriptions: {
        ...result.transcriptions,
        [modelId]: {
          model: modelId,
          text: '',
          status: 'pending' as const,
        },
      },
    })));

    const provider = parseModelId(modelId);

    try {
      // Step 1: Transcription for new model only
      const transcribeResponse = await fetch('/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKeys[0].key,
        },
        body: JSON.stringify({
          files: files.map(f => ({ file_id: f.file_id, audio_base64: f.audio_base64 })),
          providers: [provider],
        }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const transcribeData = await transcribeResponse.json();

      // Update results with transcriptions
      setEvaluationResults(prev => {
        const updated = [...prev];

        (transcribeData.data?.success || []).forEach((result: any) => {
          const resultIdx = updated.findIndex(r => r.fileId === result.file_id);
          if (resultIdx !== -1) {
            const modelKey = `${result.provider}:${result.model}`;
            updated[resultIdx] = {
              ...updated[resultIdx],
              transcriptions: {
                ...updated[resultIdx].transcriptions,
                [modelKey]: {
                  model: modelKey,
                  text: result.transcript,
                  status: 'success',
                },
              },
            };
          }
        });

        (transcribeData.data?.errors || []).forEach((result: any) => {
          const resultIdx = updated.findIndex(r => r.fileId === result.file_id);
          if (resultIdx !== -1) {
            const modelKey = `${result.provider}:${result.model}`;
            updated[resultIdx] = {
              ...updated[resultIdx],
              transcriptions: {
                ...updated[resultIdx].transcriptions,
                [modelKey]: {
                  model: modelKey,
                  text: '',
                  status: 'error',
                  error: result.error,
                },
              },
            };
          }
        });

        return updated;
      });

      // Step 2: WER Evaluation for new model
      // Get updated results to build WER items
      const currentResults = evaluationResults;
      const werItems = files.map(f => {
        const result = currentResults.find(r => r.fileId === f.file_id);
        // Find the transcription from the API response
        const successResult = (transcribeData.data?.success || []).find(
          (s: any) => s.file_id === f.file_id
        );

        if (!successResult || !f.ground_truth) return null;

        return {
          id: `${f.file_id}_${modelId}`,
          ground_truth: f.ground_truth,
          hypothesis: successResult.transcript,
          model: modelId.replace(':', '/'),
        };
      }).filter(Boolean);

      if (werItems.length > 0) {
        const werResponse = await fetch('/api/v1/evaluations/stt/wer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKeys[0].key,
          },
          body: JSON.stringify({
            items: werItems,
            mode: 'both',
          }),
        });

        if (werResponse.ok) {
          const werData = await werResponse.json();

          const werResultsMap = new Map<string, { strict: WerMetrics; lenient: WerMetrics }>();
          (werData.data?.results || []).forEach((result: any) => {
            werResultsMap.set(result.id, { strict: result.strict, lenient: result.lenient });
          });

          // Update with WER metrics
          setEvaluationResults(prev => prev.map(result => {
            const werId = `${result.fileId}_${modelId}`;
            const werResult = werResultsMap.get(werId);

            if (werResult && result.transcriptions[modelId]) {
              return {
                ...result,
                transcriptions: {
                  ...result.transcriptions,
                  [modelId]: {
                    ...result.transcriptions[modelId],
                    strict: werResult.strict,
                    lenient: werResult.lenient,
                  },
                },
              };
            }
            return result;
          }));
        }
      }

      toast.success(`Added ${STT_MODELS.find(m => m.id === modelId)?.name || modelId}`);
    } catch (error) {
      // Mark as error on failure
      setEvaluationResults(prev => prev.map(result => ({
        ...result,
        transcriptions: {
          ...result.transcriptions,
          [modelId]: {
            model: modelId,
            text: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to evaluate',
          },
        },
      })));
      toast.error(`Failed to evaluate ${STT_MODELS.find(m => m.id === modelId)?.name || modelId}`);
    }
  };

  // Run transcription and evaluation
  const runEvaluation = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    // Prepare files
    const files = inputMode === 'single'
      ? uploadedFiles.filter(f => f.groundTruth.trim()).map(f => ({
          file_id: f.id,
          audio_base64: f.base64,
          ground_truth: f.groundTruth,
          audio_url: f.name,
        }))
      : parsedRows
          .filter(r => r.status === 'success' && selectedRows.has(r.row))
          .map(r => ({
            file_id: `row-${r.row}`,
            audio_base64: r.audio_base64 || '',
            ground_truth: r.ground_truth,
            audio_url: r.audio_url,
          }));

    if (files.length === 0) {
      toast.error('No files ready for evaluation');
      return;
    }

    setIsTranscribing(true);
    setEvaluationResults([]);
    setSelectedResultIndex(0);
    setSelectedModelForDiff(null);

    // Initialize results with pending state
    const initialResults: EvaluationResult[] = files.map((f, idx) => ({
      row: idx + 1,
      fileId: f.file_id,
      audio_url: f.audio_url,
      ground_truth: f.ground_truth,
      transcriptions: Object.fromEntries(
        selectedModels.map(modelId => [modelId, {
          model: modelId,
          text: '',
          status: 'pending' as const,
        }])
      ),
    }));
    setEvaluationResults(initialResults);

    const providers = selectedModels.map(modelId => parseModelId(modelId));
    const totalTasks = files.length * providers.length;
    setTranscriptionProgress({ current: 0, total: totalTasks });

    try {
      // Step 1: Transcription
      const transcribeResponse = await fetch('/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKeys[0].key,
        },
        body: JSON.stringify({
          files: files.map(f => ({ file_id: f.file_id, audio_base64: f.audio_base64 })),
          providers,
        }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const transcribeData = await transcribeResponse.json();
      setTranscriptionProgress({ current: totalTasks, total: totalTasks });

      // Update results with transcriptions
      const updatedResults = [...initialResults];

      (transcribeData.data?.success || []).forEach((result: any) => {
        const resultIdx = updatedResults.findIndex(r => r.fileId === result.file_id);
        if (resultIdx !== -1) {
          const modelKey = `${result.provider}:${result.model}`;
          updatedResults[resultIdx].transcriptions[modelKey] = {
            model: modelKey,
            text: result.transcript,
            status: 'success',
          };
        }
      });

      (transcribeData.data?.errors || []).forEach((result: any) => {
        const resultIdx = updatedResults.findIndex(r => r.fileId === result.file_id);
        if (resultIdx !== -1) {
          const modelKey = `${result.provider}:${result.model}`;
          updatedResults[resultIdx].transcriptions[modelKey] = {
            model: modelKey,
            text: '',
            status: 'error',
            error: result.error,
          };
        }
      });

      setEvaluationResults(updatedResults);
      setIsTranscribing(false);

      // Step 2: WER Evaluation
      setIsEvaluating(true);

      const werItems = updatedResults.flatMap(result =>
        Object.entries(result.transcriptions)
          .filter(([_, t]) => t.status === 'success' && result.ground_truth)
          .map(([modelKey, t]) => ({
            id: `${result.fileId}_${modelKey}`,
            ground_truth: result.ground_truth,
            hypothesis: t.text,
            model: modelKey.replace(':', '/'),
            file_id: result.fileId,
            model_key: modelKey,
          }))
      );

      if (werItems.length > 0) {
        const werResponse = await fetch('/api/v1/evaluations/stt/wer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKeys[0].key,
          },
          body: JSON.stringify({
            items: werItems.map(item => ({
              id: item.id,
              ground_truth: item.ground_truth,
              hypothesis: item.hypothesis,
              model: item.model,
            })),
            mode: 'both',
          }),
        });

        if (werResponse.ok) {
          const werData = await werResponse.json();

          const werResultsMap = new Map<string, { strict: WerMetrics; lenient: WerMetrics }>();
          (werData.data?.results || []).forEach((result: any) => {
            werResultsMap.set(result.id, { strict: result.strict, lenient: result.lenient });
          });

          // Update with WER metrics
          const finalResults = updatedResults.map(result => {
            const newTranscriptions = { ...result.transcriptions };
            Object.keys(newTranscriptions).forEach(modelKey => {
              const werId = `${result.fileId}_${modelKey}`;
              const werResult = werResultsMap.get(werId);
              if (werResult) {
                newTranscriptions[modelKey] = {
                  ...newTranscriptions[modelKey],
                  strict: werResult.strict,
                  lenient: werResult.lenient,
                };
              }
            });
            return { ...result, transcriptions: newTranscriptions };
          });

          setEvaluationResults(finalResults);
        }
      }

      toast.success('Evaluation completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Evaluation failed');
    } finally {
      setIsTranscribing(false);
      setIsEvaluating(false);
    }
  };

  // Download results
  const downloadResultsCSV = () => {
    if (evaluationResults.length === 0) return;

    const escapeCSV = (value: any) => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build comprehensive headers for each model
    const modelHeaders = selectedModels.flatMap(m => {
      const name = STT_MODELS.find(model => model.id === m)?.name || m.split(':')[1];
      return [
        // Strict mode metrics
        `${name}_Strict_WER`,
        `${name}_Strict_Substitutions`,
        `${name}_Strict_Deletions`,
        `${name}_Strict_Insertions`,
        `${name}_Strict_Semantic_Errors`,
        // Lenient mode metrics
        `${name}_Lenient_WER`,
        `${name}_Lenient_Substitutions`,
        `${name}_Lenient_Deletions`,
        `${name}_Lenient_Insertions`,
        `${name}_Lenient_Semantic_Errors`,
        // Word counts
        `${name}_Reference_Words`,
        `${name}_Hypothesis_Words`,
        // Transcription
        `${name}_Transcription`,
      ];
    });

    const headers = ['Row', 'Audio_URL', 'Ground_Truth', ...modelHeaders];

    const rows = evaluationResults.map(result => {
      const modelValues = selectedModels.flatMap(m => {
        const t = result.transcriptions[m];
        const strict = t?.strict;
        const lenient = t?.lenient;

        return [
          // Strict mode metrics
          strict?.wer !== undefined ? (strict.wer * 100).toFixed(2) : 'N/A',
          strict?.substitutions ?? 'N/A',
          strict?.deletions ?? 'N/A',
          strict?.insertions ?? 'N/A',
          strict?.semantic_errors ?? 'N/A',
          // Lenient mode metrics
          lenient?.wer !== undefined ? (lenient.wer * 100).toFixed(2) : 'N/A',
          lenient?.substitutions ?? 'N/A',
          lenient?.deletions ?? 'N/A',
          lenient?.insertions ?? 'N/A',
          lenient?.semantic_errors ?? 'N/A',
          // Word counts
          strict?.reference_word_count ?? 'N/A',
          strict?.hypothesis_word_count ?? 'N/A',
          // Transcription
          escapeCSV(t?.text || ''),
        ];
      });

      return [result.row, escapeCSV(result.audio_url), escapeCSV(result.ground_truth), ...modelValues].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stt-evaluation-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compute nerd stats from audio base64 (client-side)
  const computeNerdStats = async (fileId: string, audioBase64: string, mediaType: string) => {
    if (fileNerdStats.has(fileId)) return; // Already computed

    try {
      // Get codec info from media type
      const getCodecInfo = (type: string): { format: string; codec: string } => {
        const typeMap: Record<string, { format: string; codec: string }> = {
          'audio/ogg': { format: 'OGG', codec: 'Opus/Vorbis' },
          'audio/opus': { format: 'OGG', codec: 'Opus' },
          'audio/mpeg': { format: 'MP3', codec: 'MPEG Layer III' },
          'audio/mp3': { format: 'MP3', codec: 'MPEG Layer III' },
          'audio/wav': { format: 'WAV', codec: 'PCM' },
          'audio/wave': { format: 'WAV', codec: 'PCM' },
          'audio/x-wav': { format: 'WAV', codec: 'PCM' },
          'audio/webm': { format: 'WebM', codec: 'Opus/Vorbis' },
          'audio/flac': { format: 'FLAC', codec: 'FLAC' },
          'audio/x-flac': { format: 'FLAC', codec: 'FLAC' },
          'audio/aac': { format: 'AAC', codec: 'AAC-LC' },
          'audio/mp4': { format: 'M4A', codec: 'AAC' },
          'audio/x-m4a': { format: 'M4A', codec: 'AAC' },
        };
        return typeMap[type.toLowerCase()] || { format: type.split('/')[1]?.toUpperCase() || 'Unknown', codec: 'Unknown' };
      };

      // Decode base64 to get file size
      const binaryString = atob(audioBase64);
      const fileSize = binaryString.length;

      // Create audio element to get duration
      const audio = new Audio(`data:${mediaType};base64,${audioBase64}`);

      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve());
        audio.addEventListener('error', () => reject(new Error('Failed to load audio')));
      });

      const { format, codec } = getCodecInfo(mediaType);
      const durationMs = Math.round(audio.duration * 1000);
      const bitrate = audio.duration > 0 ? Math.round((fileSize * 8) / audio.duration) : null;

      // Format duration as mm:ss.ms
      const mins = Math.floor(audio.duration / 60);
      const secs = Math.floor(audio.duration % 60);
      const ms = Math.round((audio.duration % 1) * 1000);
      const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;

      // Format file size
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      const stats: AudioNerdStats = {
        format,
        codec,
        mimeType: mediaType,
        durationMs,
        durationFormatted,
        sampleRate: null, // Web Audio API doesn't expose this easily
        channels: null,
        bitrate,
        fileSize,
        fileSizeFormatted: formatSize(fileSize),
        base64Length: audioBase64.length,
        compressionRatio: null,
      };

      setFileNerdStats(prev => new Map(prev).set(fileId, stats));
    } catch (error) {
      console.error('Failed to compute nerd stats:', error);
    }
  };

  // Toggle file details expansion
  const toggleFileDetails = (fileId: string, audioBase64?: string, mediaType?: string) => {
    if (expandedFileId === fileId) {
      setExpandedFileId(null);
    } else {
      setExpandedFileId(fileId);
      if (audioBase64 && mediaType && !fileNerdStats.has(fileId)) {
        computeNerdStats(fileId, audioBase64, mediaType);
      }
    }
  };

  // Current result for diff view
  const currentResult = evaluationResults[selectedResultIndex];

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

            {/* Results View Toggle */}
            {evaluationResults.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: colors.bg.secondary }}>
                {[
                  { id: 'cards', label: 'Cards', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
                  { id: 'diff', label: 'Diff', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setResultsView(view.id as ResultsView)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
                    style={{
                      backgroundColor: resultsView === view.id ? colors.bg.primary : 'transparent',
                      color: resultsView === view.id ? colors.text.primary : colors.text.secondary,
                      boxShadow: resultsView === view.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d={view.icon} />
                    </svg>
                    {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Content - Split Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Configuration */}
            <div
              className="flex-shrink-0 border-r flex flex-col overflow-hidden"
              style={{
                width: `${leftPanelWidth}px`,
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
              }}
            >
              {/* Input Mode Tabs */}
              <div className="flex border-b" style={{ borderColor: colors.border }}>
                {(['single', 'batch'] as InputMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium"
                    style={{
                      backgroundColor: inputMode === mode ? colors.bg.primary : colors.bg.secondary,
                      color: inputMode === mode ? colors.text.primary : colors.text.secondary,
                      borderBottom: inputMode === mode ? `2px solid ${colors.accent.primary}` : '2px solid transparent',
                    }}
                  >
                    {mode === 'single' ? 'Single Files' : 'Batch CSV'}
                  </button>
                ))}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Upload Section */}
                {inputMode === 'single' ? (
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                      style={{ borderColor: colors.border }}
                      onClick={() => document.getElementById('audio-upload')?.click()}
                    >
                      <input
                        id="audio-upload"
                        type="file"
                        accept=".mp3,.wav,.m4a,.ogg,.flac,.webm"
                        onChange={handleAudioFileSelect}
                        className="hidden"
                        multiple
                      />
                      <svg className="w-6 h-6 mx-auto mb-2" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-sm" style={{ color: colors.text.secondary }}>
                        Add audio files
                      </p>
                    </div>

                    {/* Uploaded Files */}
                    {uploadedFiles.map((file, idx) => {
                      const isExpanded = expandedFileId === file.id;
                      const stats = fileNerdStats.get(file.id);

                      return (
                        <div
                          key={file.id}
                          className="border rounded-lg overflow-hidden"
                          style={{
                            borderColor: file.groundTruth.trim() ? colors.status.success : colors.border,
                            backgroundColor: file.groundTruth.trim() ? 'rgba(22, 163, 74, 0.02)' : colors.bg.primary,
                          }}
                        >
                          {/* Compact View */}
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                                  style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                                >
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleFileDetails(file.id, file.base64, file.mediaType)}
                                  className="p-1 rounded"
                                  style={{ color: colors.text.secondary }}
                                  title={isExpanded ? 'Hide details' : 'Show details'}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    style={{
                                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                                  className="p-1 rounded"
                                  style={{ color: colors.text.secondary }}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <AudioPlayer
                              audioBase64={file.base64}
                              mediaType={file.mediaType}
                              isPlaying={playingFileId === file.id}
                              onPlayToggle={() => setPlayingFileId(prev => prev === file.id ? null : file.id)}
                            />

                            {!isExpanded && (
                              <textarea
                                value={file.groundTruth}
                                onChange={e => setUploadedFiles(prev =>
                                  prev.map(f => f.id === file.id ? { ...f, groundTruth: e.target.value } : f)
                                )}
                                placeholder="Enter ground truth..."
                                rows={2}
                                className="w-full mt-2 px-2 py-1.5 border rounded text-sm"
                                style={{
                                  backgroundColor: colors.bg.primary,
                                  borderColor: colors.border,
                                  color: colors.text.primary,
                                  resize: 'vertical',
                                }}
                              />
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div
                              className="border-t px-3 pb-3 pt-2 space-y-3"
                              style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
                            >
                              {/* Ground truth - full view */}
                              <div>
                                <div className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                                  Ground Truth
                                </div>
                                <textarea
                                  value={file.groundTruth}
                                  onChange={e => setUploadedFiles(prev =>
                                    prev.map(f => f.id === file.id ? { ...f, groundTruth: e.target.value } : f)
                                  )}
                                  placeholder="Enter ground truth transcription..."
                                  rows={3}
                                  className="w-full px-2 py-1.5 border rounded text-xs"
                                  style={{
                                    backgroundColor: colors.bg.primary,
                                    borderColor: colors.border,
                                    color: colors.text.primary,
                                    resize: 'vertical',
                                  }}
                                />
                              </div>

                              {/* Nerd Stats */}
                              {stats ? (
                                <div>
                                  <div className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                                    Audio Details
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                      <span style={{ color: colors.text.secondary }}>Format</span>
                                      <span className="font-mono" style={{ color: colors.text.primary }}>{stats.format}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                      <span style={{ color: colors.text.secondary }}>Codec</span>
                                      <span className="font-mono" style={{ color: colors.text.primary }}>{stats.codec}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                      <span style={{ color: colors.text.secondary }}>Duration</span>
                                      <span className="font-mono" style={{ color: colors.text.primary }}>{stats.durationFormatted}</span>
                                    </div>
                                    <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                      <span style={{ color: colors.text.secondary }}>Size</span>
                                      <span className="font-mono" style={{ color: colors.text.primary }}>{stats.fileSizeFormatted}</span>
                                    </div>
                                    {stats.sampleRate && (
                                      <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                        <span style={{ color: colors.text.secondary }}>Sample Rate</span>
                                        <span className="font-mono" style={{ color: colors.text.primary }}>{(stats.sampleRate / 1000).toFixed(1)} kHz</span>
                                      </div>
                                    )}
                                    {stats.channels && (
                                      <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                        <span style={{ color: colors.text.secondary }}>Channels</span>
                                        <span className="font-mono" style={{ color: colors.text.primary }}>{stats.channels}</span>
                                      </div>
                                    )}
                                    {stats.bitrate && (
                                      <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                        <span style={{ color: colors.text.secondary }}>Bitrate</span>
                                        <span className="font-mono" style={{ color: colors.text.primary }}>{(stats.bitrate / 1000).toFixed(0)} kbps</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-3">
                                  <div
                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: colors.text.secondary }}
                                  />
                                  <span className="text-xs ml-2" style={{ color: colors.text.secondary }}>
                                    Loading audio details...
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                      style={{
                        borderColor: csvFile ? colors.status.success : colors.border,
                        backgroundColor: csvFile ? 'rgba(22, 163, 74, 0.02)' : 'transparent',
                      }}
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileSelect}
                        className="hidden"
                        disabled={isParsing}
                      />
                      {isParsing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: colors.text.secondary }}
                          />
                          <span className="text-sm" style={{ color: colors.text.secondary }}>Parsing...</span>
                        </div>
                      ) : csvFile ? (
                        <div>
                          <svg className="w-6 h-6 mx-auto mb-1" style={{ color: colors.status.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium" style={{ color: colors.text.primary }}>{csvFile.name}</p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            {parsedRows.filter(r => r.status === 'success').length} files ready
                          </p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6 mx-auto mb-2" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm" style={{ color: colors.text.secondary }}>Upload CSV file</p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>audio_url, ground_truth</p>
                        </>
                      )}
                    </div>

                    {/* Parsed rows list */}
                    {parsedRows.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs" style={{ color: colors.text.secondary }}>
                          <span>
                            {selectedRows.size} / {parsedRows.filter(r => r.status === 'success').length} selected
                          </span>
                          <button
                            onClick={() => {
                              const successRows = parsedRows.filter(r => r.status === 'success');
                              const allSelected = successRows.every(r => selectedRows.has(r.row));
                              setSelectedRows(allSelected ? new Set() : new Set(successRows.map(r => r.row)));
                            }}
                            className="text-xs underline"
                            style={{ color: colors.accent.primary }}
                          >
                            {parsedRows.filter(r => r.status === 'success').every(r => selectedRows.has(r.row))
                              ? 'Deselect all'
                              : 'Select all'}
                          </button>
                        </div>

                        {/* Files List */}
                        <div className="space-y-2 max-h-96 overflow-auto">
                          {parsedRows.map((row, idx) => {
                            if (row.status === 'error') {
                              return (
                                <div
                                  key={`row-${row.row}`}
                                  className="border rounded-lg p-2"
                                  style={{
                                    borderColor: colors.status.error,
                                    backgroundColor: '#fef2f2',
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: colors.text.secondary }}>#{row.row}</span>
                                    <span className="text-xs flex-1 truncate" style={{ color: colors.status.error }}>
                                      {row.error || 'Failed to parse'}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            const isSelected = selectedRows.has(row.row);
                            const fileId = `row-${row.row}`;
                            const isExpanded = expandedFileId === fileId;
                            const stats = fileNerdStats.get(fileId);

                            return (
                              <div
                                key={fileId}
                                className="border rounded-lg overflow-hidden"
                                style={{
                                  borderColor: isSelected ? colors.status.success : colors.border,
                                  backgroundColor: isSelected ? 'rgba(22, 163, 74, 0.02)' : colors.bg.primary,
                                }}
                              >
                                {/* Compact View */}
                                <div className="p-3">
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedRows(prev => {
                                          const next = new Set(prev);
                                          if (next.has(row.row)) {
                                            next.delete(row.row);
                                          } else {
                                            next.add(row.row);
                                          }
                                          return next;
                                        });
                                      }}
                                      className="w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                                      style={{
                                        borderColor: isSelected ? colors.accent.primary : colors.border,
                                        backgroundColor: isSelected ? colors.accent.primary : 'transparent',
                                      }}
                                    >
                                      {isSelected && (
                                        <svg className="w-3 h-3" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span
                                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                                          style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                                        >
                                          {row.row}
                                        </span>
                                        <span className="text-xs font-medium truncate" style={{ color: colors.text.primary }}>
                                          {row.audio_url.split('/').pop() || row.audio_url}
                                        </span>
                                      </div>

                                      {row.audio_base64 && (
                                        <AudioPlayer
                                          audioBase64={row.audio_base64}
                                          mediaType={row.media_type || 'audio/mpeg'}
                                          isPlaying={playingFileId === fileId}
                                          onPlayToggle={() => setPlayingFileId(prev => prev === fileId ? null : fileId)}
                                        />
                                      )}

                                      {/* Quick stats */}
                                      {!isExpanded && (
                                        <div className="flex items-center gap-3 text-xs mt-2" style={{ color: colors.text.secondary }}>
                                          {row.file_size && <span>{formatFileSize(row.file_size)}</span>}
                                          <span>{row.ground_truth.split(' ').length} words</span>
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => toggleFileDetails(fileId, row.audio_base64, row.media_type || 'audio/mpeg')}
                                      className="p-1 rounded flex-shrink-0"
                                      style={{ color: colors.text.secondary }}
                                      title={isExpanded ? 'Hide details' : 'Show details'}
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        style={{
                                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                          transition: 'transform 0.2s ease',
                                        }}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div
                                    className="border-t px-3 pb-3 pt-2 space-y-3"
                                    style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
                                  >
                                    {/* Ground truth */}
                                    <div>
                                      <div className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                                        Ground Truth
                                      </div>
                                      <div className="text-xs p-2 rounded" style={{ backgroundColor: colors.bg.primary, color: colors.text.primary }}>
                                        {row.ground_truth}
                                      </div>
                                    </div>

                                    {/* Nerd Stats */}
                                    {stats ? (
                                      <div>
                                        <div className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                                          Audio Details
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                            <span style={{ color: colors.text.secondary }}>Format</span>
                                            <span className="font-mono" style={{ color: colors.text.primary }}>{stats.format}</span>
                                          </div>
                                          <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                            <span style={{ color: colors.text.secondary }}>Codec</span>
                                            <span className="font-mono" style={{ color: colors.text.primary }}>{stats.codec}</span>
                                          </div>
                                          <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                            <span style={{ color: colors.text.secondary }}>Duration</span>
                                            <span className="font-mono" style={{ color: colors.text.primary }}>{stats.durationFormatted}</span>
                                          </div>
                                          <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                            <span style={{ color: colors.text.secondary }}>Size</span>
                                            <span className="font-mono" style={{ color: colors.text.primary }}>{stats.fileSizeFormatted}</span>
                                          </div>
                                          {stats.sampleRate && (
                                            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                              <span style={{ color: colors.text.secondary }}>Sample Rate</span>
                                              <span className="font-mono" style={{ color: colors.text.primary }}>{(stats.sampleRate / 1000).toFixed(1)} kHz</span>
                                            </div>
                                          )}
                                          {stats.channels && (
                                            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                              <span style={{ color: colors.text.secondary }}>Channels</span>
                                              <span className="font-mono" style={{ color: colors.text.primary }}>{stats.channels}</span>
                                            </div>
                                          )}
                                          {stats.bitrate && (
                                            <div className="flex justify-between p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                                              <span style={{ color: colors.text.secondary }}>Bitrate</span>
                                              <span className="font-mono" style={{ color: colors.text.primary }}>{(stats.bitrate / 1000).toFixed(0)} kbps</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center py-3">
                                        <div
                                          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                          style={{ borderColor: colors.text.secondary }}
                                        />
                                        <span className="text-xs ml-2" style={{ color: colors.text.secondary }}>
                                          Loading audio details...
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <h3 className="text-sm font-medium mb-2" style={{ color: colors.text.primary }}>
                    Models
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(MODEL_GROUPS).map(([provider, models]) => (
                      <div key={provider}>
                        <div className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                          {provider}
                        </div>
                        <div className="space-y-1">
                          {models.map(model => (
                            <label
                              key={model.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer"
                              style={{
                                backgroundColor: selectedModels.includes(model.id) ? colors.bg.secondary : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedModels.includes(model.id)}
                                onChange={() => toggleModel(model.id)}
                                className="sr-only"
                              />
                              <div
                                className="w-4 h-4 border rounded flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderColor: selectedModels.includes(model.id) ? colors.accent.primary : colors.border,
                                  backgroundColor: selectedModels.includes(model.id) ? colors.accent.primary : 'transparent',
                                }}
                              >
                                {selectedModels.includes(model.id) && (
                                  <svg className="w-3 h-3" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm" style={{ color: colors.text.primary }}>{model.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Results */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
              {evaluationResults.length === 0 ? (
                /* Empty State */
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <svg className="w-16 h-16 mx-auto mb-4" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2" style={{ color: colors.text.primary }}>
                      Ready to Evaluate
                    </h3>
                    <p className="text-sm mb-4" style={{ color: colors.text.secondary }}>
                      Upload audio files, add ground truth text, select models, then run evaluation to see results here.
                    </p>
                    <div className="text-xs" style={{ color: colors.text.secondary }}>
                      {readyFileCount > 0 ? (
                        <span style={{ color: colors.status.success }}>
                          {readyFileCount} file{readyFileCount !== 1 ? 's' : ''} ready
                        </span>
                      ) : (
                        'No files ready yet'
                      )}
                      {' • '}
                      {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                </div>
              ) : resultsView === 'cards' ? (
                /* Cards View */
                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-6">
                    {evaluationResults.map((result, resultIdx) => {
                      const { best, worst } = getBestWorstModels(result);

                      return (
                        <div key={result.fileId} className="space-y-3">
                          {/* File Header */}
                          <div className="flex items-center gap-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                              style={{ backgroundColor: colors.accent.primary, color: '#fff' }}
                            >
                              {result.row}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                                {result.audio_url}
                              </p>
                              <p className="text-xs truncate" style={{ color: colors.text.secondary }}>
                                Ground truth: {result.ground_truth || 'Not provided'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedResultIndex(resultIdx);
                                setResultsView('diff');
                              }}
                              className="px-2 py-1 text-xs rounded"
                              style={{
                                backgroundColor: colors.bg.primary,
                                color: colors.text.secondary,
                                border: `1px solid ${colors.border}`,
                              }}
                            >
                              View Diff
                            </button>
                          </div>

                          {/* Model Cards Grid */}
                          <div
                            className="grid gap-3"
                            style={{
                              gridTemplateColumns: `repeat(${Math.min(selectedModels.length, 3)}, 1fr)`,
                              alignItems: 'start',
                            }}
                          >
                            {selectedModels.map(modelId => {
                              const transcription = result.transcriptions[modelId];
                              const modelConfig = STT_MODELS.find(m => m.id === modelId);

                              return (
                                <ModelComparisonCard
                                  key={modelId}
                                  modelId={modelId}
                                  modelName={modelConfig?.name || modelId.split(':')[1]}
                                  provider={modelConfig?.provider || modelId.split(':')[0]}
                                  transcript={transcription?.text || ''}
                                  status={transcription?.status || 'pending'}
                                  error={transcription?.error}
                                  strictMetrics={transcription?.strict}
                                  lenientMetrics={transcription?.lenient}
                                  isBest={best === modelId}
                                  isWorst={worst === modelId && best !== worst}
                                  onClick={() => {
                                    setSelectedResultIndex(resultIdx);
                                    setSelectedModelForDiff(modelId);
                                    setResultsView('diff');
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Diff View */
                <div className="flex-1 overflow-auto p-4">
                  {currentResult && (
                    <div className="space-y-4">
                      {/* Result Selector */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedResultIndex(prev => Math.max(0, prev - 1))}
                          disabled={selectedResultIndex === 0}
                          className="p-1.5 rounded"
                          style={{
                            backgroundColor: colors.bg.primary,
                            color: selectedResultIndex === 0 ? colors.text.secondary : colors.text.primary,
                            opacity: selectedResultIndex === 0 ? 0.5 : 1,
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex-1">
                          <select
                            value={selectedResultIndex}
                            onChange={e => setSelectedResultIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-md text-sm"
                            style={{
                              backgroundColor: colors.bg.primary,
                              border: `1px solid ${colors.border}`,
                              color: colors.text.primary,
                            }}
                          >
                            {evaluationResults.map((r, idx) => (
                              <option key={r.fileId} value={idx}>
                                {idx + 1}. {r.audio_url}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setSelectedResultIndex(prev => Math.min(evaluationResults.length - 1, prev + 1))}
                          disabled={selectedResultIndex === evaluationResults.length - 1}
                          className="p-1.5 rounded"
                          style={{
                            backgroundColor: colors.bg.primary,
                            color: selectedResultIndex === evaluationResults.length - 1 ? colors.text.secondary : colors.text.primary,
                            opacity: selectedResultIndex === evaluationResults.length - 1 ? 0.5 : 1,
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Model Tabs */}
                      <div className="flex gap-2 flex-wrap">
                        {selectedModels.map(modelId => {
                          const transcription = currentResult.transcriptions[modelId];
                          const modelConfig = STT_MODELS.find(m => m.id === modelId);
                          const isSelected = selectedModelForDiff === modelId;
                          const werPercent = transcription?.strict?.wer !== undefined
                            ? (transcription.strict.wer * 100).toFixed(1)
                            : null;

                          return (
                            <button
                              key={modelId}
                              onClick={() => setSelectedModelForDiff(modelId)}
                              className="px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
                              style={{
                                backgroundColor: isSelected ? colors.accent.primary : colors.bg.primary,
                                color: isSelected ? '#fff' : colors.text.primary,
                                border: `1px solid ${isSelected ? colors.accent.primary : colors.border}`,
                              }}
                            >
                              {modelConfig?.name || modelId.split(':')[1]}
                              {werPercent && (
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.bg.secondary,
                                  }}
                                >
                                  {werPercent}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Diff Content */}
                      {selectedModelForDiff && currentResult.transcriptions[selectedModelForDiff] && (
                        <div
                          className="rounded-lg border p-4"
                          style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
                        >
                          <TranscriptionDiffViewer
                            groundTruth={currentResult.ground_truth}
                            hypothesis={currentResult.transcriptions[selectedModelForDiff].text}
                          />

                          {/* Metrics */}
                          {currentResult.transcriptions[selectedModelForDiff].strict && (
                            <div
                              className="mt-4 pt-4 border-t grid grid-cols-2 gap-4"
                              style={{ borderColor: colors.border }}
                            >
                              <div>
                                <h4 className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                                  Strict Mode
                                </h4>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  {['wer', 'substitutions', 'deletions', 'insertions'].map(metric => (
                                    <div key={metric}>
                                      <div className="text-xs" style={{ color: colors.text.secondary }}>
                                        {metric === 'wer' ? 'WER' : metric.charAt(0).toUpperCase() + metric.slice(1, 3)}
                                      </div>
                                      <div className="text-lg font-bold" style={{ color: colors.text.primary }}>
                                        {metric === 'wer'
                                          ? `${(currentResult.transcriptions[selectedModelForDiff].strict![metric] * 100).toFixed(1)}%`
                                          : currentResult.transcriptions[selectedModelForDiff].strict![metric as keyof WerMetrics]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                                  Lenient Mode
                                </h4>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  {['wer', 'substitutions', 'deletions', 'insertions'].map(metric => (
                                    <div key={metric}>
                                      <div className="text-xs" style={{ color: colors.text.secondary }}>
                                        {metric === 'wer' ? 'WER' : metric.charAt(0).toUpperCase() + metric.slice(1, 3)}
                                      </div>
                                      <div className="text-lg font-bold" style={{ color: colors.text.primary }}>
                                        {metric === 'wer'
                                          ? `${(currentResult.transcriptions[selectedModelForDiff].lenient![metric] * 100).toFixed(1)}%`
                                          : currentResult.transcriptions[selectedModelForDiff].lenient![metric as keyof WerMetrics]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!selectedModelForDiff && (
                        <div
                          className="rounded-lg border p-8 text-center"
                          style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
                        >
                          <p style={{ color: colors.text.secondary }}>
                            Select a model above to view the diff comparison
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Bar */}
          <div
            className="border-t px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            <div className="flex items-center gap-4 text-sm" style={{ color: colors.text.secondary }}>
              <span>
                {readyFileCount} file{readyFileCount !== 1 ? 's' : ''} ready
              </span>
              <span>•</span>
              <span>
                {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
              </span>
              {evaluationResults.length > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: colors.status.success }}>
                    {evaluationResults.length} result{evaluationResults.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {evaluationResults.length > 0 && (
                <button
                  onClick={downloadResultsCSV}
                  className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5"
                  style={{
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}

              <button
                onClick={runEvaluation}
                disabled={isTranscribing || isEvaluating || readyFileCount === 0 || selectedModels.length === 0}
                className="px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
                style={{
                  backgroundColor: (isTranscribing || isEvaluating || readyFileCount === 0 || selectedModels.length === 0)
                    ? colors.bg.secondary
                    : colors.accent.primary,
                  color: (isTranscribing || isEvaluating || readyFileCount === 0 || selectedModels.length === 0)
                    ? colors.text.secondary
                    : '#fff',
                  cursor: (isTranscribing || isEvaluating || readyFileCount === 0 || selectedModels.length === 0)
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                {isTranscribing || isEvaluating ? (
                  <>
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
                    />
                    {isTranscribing ? `Transcribing (${transcriptionProgress.current}/${transcriptionProgress.total})` : 'Evaluating...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Evaluation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
