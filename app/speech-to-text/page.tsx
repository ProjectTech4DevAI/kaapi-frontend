/**
 * Speech-to-Text Evaluation Page
 *
 * Two input modes:
 * 1. Single File: Upload audio file + ground truth text
 * 2. Batch CSV: Upload CSV with audio_url, ground_truth columns
 *
 * Evaluates transcription quality (WER) across multiple STT models
 */

"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { colors } from '@/app/lib/colors';
import Sidebar from '@/app/components/Sidebar';
import TabNavigation from '@/app/components/TabNavigation';
import { useToast } from '@/app/components/Toast';
import { APIKey, STORAGE_KEY } from '@/app/keystore/page';

// Audio Nerd Stats type
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

// Audio Waveform Player Component
interface AudioWaveformPlayerProps {
  audioBase64: string;
  mediaType: string;
  rowId: number;
  fileSize: number;
  isPlaying: boolean;
  onPlayToggle: (rowId: number) => void;
}

function AudioWaveformPlayer({ audioBase64, mediaType, rowId, fileSize, isPlaying, onPlayToggle }: AudioWaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNerdStats, setShowNerdStats] = useState(false);
  const [nerdStats, setNerdStats] = useState<AudioNerdStats | null>(null);

  // Create audio source URL from base64
  const audioSrc = `data:${mediaType};base64,${audioBase64}`;

  // Initialize audio context and analyser
  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;

    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        // Draw static bars when not playing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = canvas.width / 16;
        const gap = 2;
        for (let i = 0; i < 16; i++) {
          const barHeight = 4 + Math.random() * 4;
          ctx.fillStyle = colors.text.secondary;
          ctx.fillRect(i * (barWidth + gap), (canvas.height - barHeight) / 2, barWidth - gap, barHeight);
        }
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      const gap = 1;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const x = i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;

        // Gradient from accent to secondary
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, colors.accent.primary);
        gradient.addColorStop(1, colors.accent.hover);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      }
    };

    draw();
  }, [isPlaying]);

  // Handle play/pause
  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    onPlayToggle(rowId);
  };

  // Sync play state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(console.error);
      drawWaveform();
    } else {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying, drawWaveform]);

  // Parse codec from media type
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

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);

      // Calculate nerd stats
      const { format, codec } = getCodecInfo(mediaType);
      const durationMs = Math.round(audio.duration * 1000);
      const bitrate = audio.duration > 0 ? Math.round((fileSize * 8) / audio.duration / 1000) : null;

      // Format duration as mm:ss.ms
      const mins = Math.floor(audio.duration / 60);
      const secs = Math.floor(audio.duration % 60);
      const ms = Math.round((audio.duration % 1) * 1000);
      const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;

      // Format file size
      const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      // Try to get sample rate from AudioContext if available
      const sampleRate: number | null = audioContextRef.current?.sampleRate || null;
      const channels: number | null = null;

      // Calculate base64 overhead and compression ratio
      const base64Length = audioBase64.length;
      // Estimate raw PCM size (assuming 16-bit, 44.1kHz, stereo as baseline)
      const estimatedRawSize = audio.duration * 44100 * 2 * 2; // duration * sampleRate * channels * bytesPerSample
      const compressionRatio = estimatedRawSize > 0 ? Math.round(estimatedRawSize / fileSize) : null;

      const stats: AudioNerdStats = {
        format,
        codec,
        mimeType: mediaType,
        durationMs,
        durationFormatted,
        sampleRate,
        channels,
        bitrate,
        fileSize,
        fileSizeFormatted: formatSize(fileSize),
        base64Length,
        compressionRatio,
      };

      setNerdStats(stats);
      console.log(`[AudioPlayer] Row ${rowId}: Duration ${audio.duration.toFixed(3)}s | ${format} | ${bitrate}kbps | ~${compressionRatio}:1 compression`);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      onPlayToggle(rowId);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [rowId, onPlayToggle, mediaType, fileSize, audioBase64]);

  // Update sample rate after AudioContext is initialized
  useEffect(() => {
    if (audioContextRef.current && nerdStats && !nerdStats.sampleRate) {
      setNerdStats(prev => prev ? {
        ...prev,
        sampleRate: audioContextRef.current?.sampleRate || null,
      } : null);
    }
  }, [isPlaying, nerdStats]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw initial static waveform
  useEffect(() => {
    if (!canvasRef.current || isPlaying) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = canvas.width / 16;
    const gap = 2;
    for (let i = 0; i < 16; i++) {
      const barHeight = 4 + Math.sin(i * 0.5) * 4 + 4;
      ctx.fillStyle = colors.text.secondary;
      ctx.fillRect(i * (barWidth + gap), (canvas.height - barHeight) / 2, barWidth - gap, barHeight);
    }
  }, [isPlaying]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 relative">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          backgroundColor: isPlaying ? colors.accent.primary : colors.bg.secondary,
          color: isPlaying ? '#fff' : colors.text.primary,
          transition: 'all 0.15s ease',
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

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={80}
        height={24}
        className="flex-shrink-0"
        style={{ opacity: isPlaying ? 1 : 0.5 }}
      />

      {/* Duration */}
      <span className="text-xs tabular-nums" style={{ color: colors.text.secondary, minWidth: '32px' }}>
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>

      {/* Nerd Stats Icon */}
      {nerdStats && (
        <div
          className="relative"
          onMouseEnter={() => setShowNerdStats(true)}
          onMouseLeave={() => setShowNerdStats(false)}
        >
          <button
            className="w-4 h-4 flex items-center justify-center rounded opacity-40 hover:opacity-100"
            style={{ transition: 'opacity 0.15s ease' }}
            title="Audio stats for nerds"
          >
            <svg className="w-3 h-3" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Nerd Stats Tooltip - appears below to avoid clipping */}
          {showNerdStats && (
            <div
              className="absolute top-full left-0 mt-2 z-50"
              style={{ animation: 'fadeIn 0.15s ease' }}
            >
              {/* Arrow pointing up */}
              <div
                className="absolute bottom-full left-4 w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid #0a0a0a',
                }}
              />

              <div
                className="rounded-lg shadow-xl"
                style={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #262626',
                  minWidth: '280px',
                }}
              >
                {/* Stats Header */}
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: '1px solid #262626' }}
                >
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: '#262626', color: '#f5f5f5' }}
                  >
                    {nerdStats.format}
                  </span>
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#1a1a1a', color: '#a3a3a3' }}
                  >
                    {nerdStats.codec}
                  </span>
                </div>

                {/* Stats Content */}
                <div className="px-4 py-3 space-y-2">
                  {/* Duration & Size Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                        Duration
                      </div>
                      <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                        {nerdStats.durationFormatted}
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: '#525252' }}>
                        {nerdStats.durationMs.toLocaleString()} ms
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                        File Size
                      </div>
                      <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                        {nerdStats.fileSizeFormatted}
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: '#525252' }}>
                        {nerdStats.fileSize.toLocaleString()} bytes
                      </div>
                    </div>
                  </div>

                  {/* Technical Details Row */}
                  <div className="grid grid-cols-2 gap-4 pt-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                    {nerdStats.bitrate && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                          Bitrate
                        </div>
                        <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                          {nerdStats.bitrate} kbps
                        </div>
                      </div>
                    )}
                    {nerdStats.sampleRate && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                          Sample Rate
                        </div>
                        <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                          {(nerdStats.sampleRate / 1000).toFixed(1)} kHz
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Compression & Base64 Row */}
                  <div className="grid grid-cols-2 gap-4 pt-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                    {nerdStats.compressionRatio && nerdStats.compressionRatio > 1 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                          Compression
                        </div>
                        <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                          ~{nerdStats.compressionRatio}:1
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                        Base64 Size
                      </div>
                      <div className="font-mono text-[12px]" style={{ color: '#e5e5e5' }}>
                        {(nerdStats.base64Length / 1024).toFixed(1)} KB
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: '#525252' }}>
                        +{((nerdStats.base64Length / nerdStats.fileSize - 1) * 100).toFixed(0)}% overhead
                      </div>
                    </div>
                  </div>

                  {/* MIME Type */}
                  <div className="pt-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                    <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#525252' }}>
                      MIME Type
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: '#737373' }}>
                      {nerdStats.mimeType}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-2 text-[9px] text-center font-mono"
                  style={{ borderTop: '1px solid #262626', color: '#404040' }}
                >
                  🎧 stats for nerds
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Types
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
  status: 'success' | 'error';
  error?: string;
}

interface EvaluationResult {
  row: number;
  audio_url: string;
  ground_truth: string;
  transcriptions: Record<string, TranscriptionResult>;
}

// Transcription preview row - before WER evaluation
interface TranscriptionPreviewRow {
  file_id: string;
  row: number;
  audio_url: string;
  ground_truth: string;
  transcripts: Record<string, { // keyed by "provider:model"
    provider: string;
    model: string;
    transcript: string;
    status: 'success' | 'error';
    error?: string;
  }>;
}

type InputMode = 'single' | 'batch';

// Available STT Models - id format: "provider:model" for API mapping
const STT_MODELS: ModelConfig[] = [
  // Google Gemini
  { id: 'gemini:gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gemini:gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  // Google Cloud STT
  { id: 'google-stt:chirp_3', name: 'Chirp 3', provider: 'Google' },
  // OpenAI
  { id: 'openai:gpt-4o-transcribe', name: 'GPT-4o Transcribe', provider: 'OpenAI' },
  { id: 'openai:whisper-1', name: 'Whisper-1', provider: 'OpenAI' },
  // AI4Bharat
  { id: 'ai4bharat:indic-conformer-600m-multilingual', name: 'Indic Conformer 600M', provider: 'AI4Bharat' },
];

// Helper to parse model ID into provider and model
const parseModelId = (modelId: string): { provider: string; model: string } => {
  const [provider, model] = modelId.split(':');
  return { provider, model };
};

// Group models by provider
const MODEL_GROUPS = STT_MODELS.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, ModelConfig[]>);

export default function SpeechToTextPage() {
  const toast = useToast();

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Tab state
  const [inputMode, setInputMode] = useState<InputMode>('single');

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);

  // Single/Multiple file mode state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAudioFile[]>([]);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);

  // Batch mode state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [playingRowId, setPlayingRowId] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Model selection
  const [selectedModels, setSelectedModels] = useState<string[]>(['openai:whisper-1']);

  // Transcription state (Step 1)
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionPreviewRow[]>([]);
  const [transcriptionProgress, setTranscriptionProgress] = useState({ current: 0, total: 0 });

  // Evaluation state (Step 2)
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Drill-down modal state
  const [selectedResultRow, setSelectedResultRow] = useState<EvaluationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load API keys
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Handle audio file selection (supports multiple files)
  const handleAudioFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];
    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));
      if (isValid) {
        validFiles.push(file);
      }
    });

    if (validFiles.length === 0) {
      toast.error('Please select valid audio files (mp3, wav, m4a, ogg, flac, webm)');
      event.target.value = '';
      return;
    }

    if (validFiles.length < files.length) {
      toast.warning(`${files.length - validFiles.length} file(s) skipped - unsupported format`);
    }

    // Process each file
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];

        const newFile: UploadedAudioFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          base64,
          mediaType: file.type || 'audio/mpeg',
          groundTruth: '',
        };

        setUploadedFiles(prev => [...prev, newFile]);
        console.log('[STT Page] File loaded:', file.name, 'type:', file.type, 'size:', file.size);
      };
      reader.onerror = () => {
        console.error('[STT Page] Failed to read audio file:', file.name);
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  // Update ground truth for a specific file
  const updateGroundTruth = useCallback((fileId: string, text: string) => {
    setUploadedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, groundTruth: text } : f
    ));
  }, []);

  // Remove a file from the list
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (playingFileId === fileId) {
      setPlayingFileId(null);
    }
  }, [playingFileId]);

  // Handle file play toggle
  const handleFilePlayToggle = useCallback((fileId: string) => {
    setPlayingFileId(prev => prev === fileId ? null : fileId);
    // Stop batch audio if file audio starts playing
    setPlayingRowId(null);
  }, []);

  // Handle CSV file selection (batch mode)
  const handleCsvFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      event.target.value = '';
      return;
    }

    setCsvFile(file);
    setParsedRows([]);
    setSelectedRows(new Set());

    // Parse CSV
    await parseCSV(file);
  };

  // Handle audio play toggle for batch mode - only one audio can play at a time
  const handleAudioPlayToggle = useCallback((rowId: number) => {
    console.log('[STT Page] Audio play toggle for row:', rowId);
    setPlayingRowId(prev => prev === rowId ? null : rowId);
    // Stop uploaded file audio if batch audio starts playing
    setPlayingFileId(null);
  }, []);

  // Toggle individual row selection
  const toggleRowSelection = useCallback((rowId: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Toggle all rows selection
  const toggleAllRows = useCallback(() => {
    const successRows = parsedRows.filter(r => r.status === 'success');
    const allSelected = successRows.every(r => selectedRows.has(r.row));

    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(successRows.map(r => r.row)));
    }
  }, [parsedRows, selectedRows]);

  // Parse CSV and fetch audio files
  const parseCSV = async (file: File) => {
    console.log('[STT Page] Starting CSV parse for file:', file.name, 'size:', file.size);

    if (apiKeys.length === 0) {
      console.error('[STT Page] No API key found');
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setIsParsing(true);
    setPlayingRowId(null); // Stop any playing audio

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[STT Page] Sending CSV to parse endpoint...');
      const response = await fetch('/api/speech-to-text/parse-csv', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKeys[0].key,
        },
        body: formData,
      });

      console.log('[STT Page] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to parse CSV: ${response.status}`);
      }

      const data = await response.json();
      console.log('[STT Page] Parsed response:', data);
      console.log('[STT Page] Rows received:', data.rows?.length || 0);

      // Debug: Log first row details if available
      if (data.rows?.[0]) {
        const firstRow = data.rows[0];
        console.log('[STT Page] First row details:', {
          row: firstRow.row,
          status: firstRow.status,
          audio_url: firstRow.audio_url,
          ground_truth: firstRow.ground_truth?.substring(0, 50) + '...',
          has_audio_base64: !!firstRow.audio_base64,
          audio_base64_length: firstRow.audio_base64?.length || 0,
          media_type: firstRow.media_type,
          file_size: firstRow.file_size,
        });
      }

      setParsedRows(data.rows || []);

      // Auto-select all successful rows
      const successfulRows = (data.rows || []).filter((r: ParsedRow) => r.status === 'success');
      setSelectedRows(new Set(successfulRows.map((r: ParsedRow) => r.row)));

      const successCount = data.rows?.filter((r: ParsedRow) => r.status === 'success').length || 0;
      const errorCount = data.rows?.filter((r: ParsedRow) => r.status === 'error').length || 0;

      console.log('[STT Page] Parse complete - Success:', successCount, 'Errors:', errorCount);

      if (errorCount > 0) {
        toast.warning(`Parsed ${successCount} files, ${errorCount} failed`);
      } else {
        toast.success(`Successfully parsed ${successCount} audio files`);
      }
    } catch (error) {
      console.error('[STT Page] CSV parsing error:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  // Select all models in a provider group
  const toggleProviderModels = (provider: string) => {
    const providerModelIds = MODEL_GROUPS[provider].map(m => m.id);
    const allSelected = providerModelIds.every(id => selectedModels.includes(id));

    if (allSelected) {
      setSelectedModels(prev => prev.filter(id => !providerModelIds.includes(id)));
    } else {
      setSelectedModels(prev => [...new Set([...prev, ...providerModelIds])]);
    }
  };

  // Step 1: Run Transcription
  const runTranscription = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model');
      return;
    }

    if (inputMode === 'single') {
      if (uploadedFiles.length === 0) {
        toast.error('Please upload at least one audio file');
        return;
      }
    } else {
      const selectedValidRows = parsedRows.filter(r => r.status === 'success' && selectedRows.has(r.row));
      if (selectedValidRows.length === 0) {
        toast.error('Please select at least one audio file to transcribe');
        return;
      }
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionResults([]);
    setEvaluationResults([]); // Clear previous evaluation results

    try {
      // Prepare files for API
      const files = inputMode === 'single'
        ? uploadedFiles.map(f => ({
            file_id: f.id,
            audio_base64: f.base64,
          }))
        : parsedRows
            .filter(r => r.status === 'success' && selectedRows.has(r.row))
            .map(r => ({
              file_id: `row-${r.row}`,
              audio_base64: r.audio_base64 || '',
            }));

      // Prepare providers from selected models
      const providers = selectedModels.map(modelId => parseModelId(modelId));

      const totalTasks = files.length * providers.length;
      setTranscriptionProgress({ current: 0, total: totalTasks });

      console.log('[STT Page] Starting transcription:', {
        fileCount: files.length,
        providerCount: providers.length,
        totalTasks,
      });

      // Call the transcription API
      const response = await fetch('/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKeys[0].key,
        },
        body: JSON.stringify({ files, providers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[STT Page] Transcription response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Transcription failed');
      }

      // Transform API response to TranscriptionPreviewRow format
      const resultsMap = new Map<string, TranscriptionPreviewRow>();

      // Get ground truth and audio URL maps
      const groundTruthMap = new Map<string, string>();
      const audioUrlMap = new Map<string, string>();

      if (inputMode === 'single') {
        uploadedFiles.forEach((f, idx) => {
          groundTruthMap.set(f.id, f.groundTruth);
          audioUrlMap.set(f.id, f.name);
          // Initialize result row
          resultsMap.set(f.id, {
            file_id: f.id,
            row: idx + 1,
            audio_url: f.name,
            ground_truth: f.groundTruth,
            transcripts: {},
          });
        });
      } else {
        parsedRows.filter(r => r.status === 'success' && selectedRows.has(r.row)).forEach(r => {
          const fileId = `row-${r.row}`;
          groundTruthMap.set(fileId, r.ground_truth);
          audioUrlMap.set(fileId, r.audio_url);
          // Initialize result row
          resultsMap.set(fileId, {
            file_id: fileId,
            row: r.row,
            audio_url: r.audio_url,
            ground_truth: r.ground_truth,
            transcripts: {},
          });
        });
      }

      // Process successful transcriptions
      (data.data?.success || []).forEach((result: {
        file_id: string;
        provider: string;
        model: string;
        transcript: string;
        status: string;
      }) => {
        const fileId = result.file_id;
        const modelKey = `${result.provider}:${result.model}`;
        const row = resultsMap.get(fileId);

        if (row) {
          row.transcripts[modelKey] = {
            provider: result.provider,
            model: result.model,
            transcript: result.transcript,
            status: 'success',
          };
        }
      });

      // Process errors
      (data.data?.errors || []).forEach((result: {
        file_id: string;
        provider: string;
        model: string;
        error?: string;
      }) => {
        const fileId = result.file_id;
        const modelKey = `${result.provider}:${result.model}`;
        const row = resultsMap.get(fileId);

        if (row) {
          row.transcripts[modelKey] = {
            provider: result.provider,
            model: result.model,
            transcript: '',
            status: 'error',
            error: result.error,
          };
        }
      });

      const results = Array.from(resultsMap.values()).sort((a, b) => a.row - b.row);
      setTranscriptionProgress({ current: totalTasks, total: totalTasks });
      setTranscriptionResults(results);

      const successCount = data.data?.processed || 0;
      const failedCount = data.data?.failed || 0;

      if (failedCount > 0) {
        toast.warning(`Transcription completed with ${failedCount} error(s)`);
      } else {
        toast.success(`Transcription completed (${successCount} tasks)`);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(error instanceof Error ? error.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Step 2: Run WER Evaluation on transcription results
  const runWerEvaluation = async () => {
    if (transcriptionResults.length === 0) {
      toast.error('Please run transcription first');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setIsEvaluating(true);
    setEvaluationResults([]);
    setIsSummaryOpen(false);

    try {
      // Build WER evaluation items from transcription results
      // Each item is: file_id + model -> ground_truth vs hypothesis
      const werItems: Array<{
        id: string;
        ground_truth: string;
        hypothesis: string;
        model: string;
        file_id: string;
        model_key: string;
      }> = [];

      transcriptionResults.forEach(row => {
        Object.entries(row.transcripts).forEach(([modelKey, transcript]) => {
          if (transcript.status === 'success' && row.ground_truth) {
            // Convert model key format from "provider:model" to "provider/model"
            const modelForApi = modelKey.replace(':', '/');
            // Use consistent ID format: file_id_modelKey for proper result mapping
            werItems.push({
              id: `${row.file_id}_${modelKey}`,
              ground_truth: row.ground_truth,
              hypothesis: transcript.transcript,
              model: modelForApi,
              file_id: row.file_id,
              model_key: modelKey,
            });
          }
        });
      });

      if (werItems.length === 0) {
        toast.error('No valid transcriptions with ground truth to evaluate');
        setIsEvaluating(false);
        return;
      }

      console.log('[STT Page] Starting WER evaluation:', {
        itemCount: werItems.length,
      });

      // Call the WER evaluation API
      const response = await fetch('/api/v1/evaluations/stt/wer', {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[STT Page] WER evaluation response:', data);

      if (!data.success) {
        throw new Error(data.error || 'WER evaluation failed');
      }

      // Create a map of WER results by ID
      const werResultsMap = new Map<string, {
        strict: WerMetrics;
        lenient: WerMetrics;
      }>();

      (data.data?.results || []).forEach((result: {
        id: string;
        strict: WerMetrics;
        lenient: WerMetrics;
      }) => {
        werResultsMap.set(result.id, {
          strict: result.strict,
          lenient: result.lenient,
        });
      });

      // Transform to EvaluationResult format
      const results: EvaluationResult[] = transcriptionResults.map(row => {
        const transcriptions: Record<string, TranscriptionResult> = {};

        Object.entries(row.transcripts).forEach(([modelKey, transcript]) => {
          const werId = `${row.file_id}_${modelKey}`;
          const werResult = werResultsMap.get(werId);

          transcriptions[modelKey] = {
            model: modelKey,
            text: transcript.transcript,
            strict: werResult?.strict,
            lenient: werResult?.lenient,
            status: transcript.status,
            error: transcript.error,
          };
        });

        return {
          row: row.row,
          audio_url: row.audio_url,
          ground_truth: row.ground_truth,
          transcriptions,
        };
      });

      setEvaluationResults(results);

      const processed = data.data?.processed || 0;
      toast.success(`WER evaluation completed (${processed} items)`);
    } catch (error) {
      console.error('WER evaluation error:', error);
      toast.error(error instanceof Error ? error.message : 'WER evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Download results as CSV with all metrics
  const downloadResultsCSV = () => {
    if (evaluationResults.length === 0) return;

    // Helper to escape CSV values
    const escapeCSV = (value: string | number | undefined | null): string => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build headers with all metrics for each model
    const modelHeaders: string[] = [];
    selectedModels.forEach(m => {
      const modelName = STT_MODELS.find(model => model.id === m)?.name || m.split(':')[1];
      // Strict metrics
      modelHeaders.push(`${modelName}_Strict_WER`);
      modelHeaders.push(`${modelName}_Strict_Substitutions`);
      modelHeaders.push(`${modelName}_Strict_Deletions`);
      modelHeaders.push(`${modelName}_Strict_Insertions`);
      modelHeaders.push(`${modelName}_Strict_Semantic_Errors`);
      modelHeaders.push(`${modelName}_Strict_Ref_Words`);
      modelHeaders.push(`${modelName}_Strict_Hyp_Words`);
      // Lenient metrics
      modelHeaders.push(`${modelName}_Lenient_WER`);
      modelHeaders.push(`${modelName}_Lenient_Substitutions`);
      modelHeaders.push(`${modelName}_Lenient_Deletions`);
      modelHeaders.push(`${modelName}_Lenient_Insertions`);
      modelHeaders.push(`${modelName}_Lenient_Semantic_Errors`);
      modelHeaders.push(`${modelName}_Lenient_Ref_Words`);
      modelHeaders.push(`${modelName}_Lenient_Hyp_Words`);
      // Transcription
      modelHeaders.push(`${modelName}_Transcription`);
    });

    const headers = ['Row', 'Audio_URL', 'Ground_Truth', ...modelHeaders];

    const rows = evaluationResults.map(result => {
      const modelValues: string[] = [];
      selectedModels.forEach(m => {
        const t = result.transcriptions[m];
        const strict = t?.strict;
        const lenient = t?.lenient;

        // Strict metrics
        modelValues.push(strict?.wer !== undefined ? (strict.wer * 100).toFixed(4) + '%' : 'N/A');
        modelValues.push(strict?.substitutions?.toString() || 'N/A');
        modelValues.push(strict?.deletions?.toString() || 'N/A');
        modelValues.push(strict?.insertions?.toString() || 'N/A');
        modelValues.push(strict?.semantic_errors?.toString() || 'N/A');
        modelValues.push(strict?.reference_word_count?.toString() || 'N/A');
        modelValues.push(strict?.hypothesis_word_count?.toString() || 'N/A');

        // Lenient metrics
        modelValues.push(lenient?.wer !== undefined ? (lenient.wer * 100).toFixed(4) + '%' : 'N/A');
        modelValues.push(lenient?.substitutions?.toString() || 'N/A');
        modelValues.push(lenient?.deletions?.toString() || 'N/A');
        modelValues.push(lenient?.insertions?.toString() || 'N/A');
        modelValues.push(lenient?.semantic_errors?.toString() || 'N/A');
        modelValues.push(lenient?.reference_word_count?.toString() || 'N/A');
        modelValues.push(lenient?.hypothesis_word_count?.toString() || 'N/A');

        // Transcription text
        modelValues.push(escapeCSV(t?.text || (t?.status === 'error' ? `ERROR: ${t.error}` : '')));
      });

      return [
        result.row,
        escapeCSV(result.audio_url),
        escapeCSV(result.ground_truth),
        ...modelValues
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // Use Blob for proper download without truncation
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stt-evaluation-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
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

  // Get WER color based on value
  const getWerColor = (wer: number) => {
    if (wer < 5) return colors.status.success;
    if (wer < 10) return colors.status.warning;
    return colors.status.error;
  };

  // Compute model-wise summary statistics from evaluation results
  const computeModelWiseStats = () => {
    if (evaluationResults.length === 0) return {};

    const modelStats: Record<string, {
      modelName: string;
      provider: string;
      count: number;
      strictWers: number[];
      lenientWers: number[];
      strictSubs: number[];
      strictDels: number[];
      strictIns: number[];
      lenientSubs: number[];
      lenientDels: number[];
      lenientIns: number[];
    }> = {};

    // Collect all WER values per model
    evaluationResults.forEach(result => {
      Object.entries(result.transcriptions).forEach(([modelKey, transcription]) => {
        if (transcription.status === 'success' && transcription.strict && transcription.lenient) {
          if (!modelStats[modelKey]) {
            const modelConfig = STT_MODELS.find(m => m.id === modelKey);
            modelStats[modelKey] = {
              modelName: modelConfig?.name || modelKey.split(':')[1],
              provider: modelConfig?.provider || modelKey.split(':')[0],
              count: 0,
              strictWers: [],
              lenientWers: [],
              strictSubs: [],
              strictDels: [],
              strictIns: [],
              lenientSubs: [],
              lenientDels: [],
              lenientIns: [],
            };
          }
          modelStats[modelKey].count++;
          modelStats[modelKey].strictWers.push(transcription.strict.wer);
          modelStats[modelKey].lenientWers.push(transcription.lenient.wer);
          modelStats[modelKey].strictSubs.push(transcription.strict.substitutions);
          modelStats[modelKey].strictDels.push(transcription.strict.deletions);
          modelStats[modelKey].strictIns.push(transcription.strict.insertions);
          modelStats[modelKey].lenientSubs.push(transcription.lenient.substitutions);
          modelStats[modelKey].lenientDels.push(transcription.lenient.deletions);
          modelStats[modelKey].lenientIns.push(transcription.lenient.insertions);
        }
      });
    });

    // Compute averages
    const result: Record<string, {
      modelName: string;
      provider: string;
      count: number;
      avgStrictWer: number;
      minStrictWer: number;
      maxStrictWer: number;
      avgLenientWer: number;
      minLenientWer: number;
      maxLenientWer: number;
      avgStrictSubs: number;
      avgStrictDels: number;
      avgStrictIns: number;
      avgLenientSubs: number;
      avgLenientDels: number;
      avgLenientIns: number;
    }> = {};

    Object.entries(modelStats).forEach(([modelKey, stats]) => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
      const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

      result[modelKey] = {
        modelName: stats.modelName,
        provider: stats.provider,
        count: stats.count,
        avgStrictWer: avg(stats.strictWers),
        minStrictWer: min(stats.strictWers),
        maxStrictWer: max(stats.strictWers),
        avgLenientWer: avg(stats.lenientWers),
        minLenientWer: min(stats.lenientWers),
        maxLenientWer: max(stats.lenientWers),
        avgStrictSubs: avg(stats.strictSubs),
        avgStrictDels: avg(stats.strictDels),
        avgStrictIns: avg(stats.strictIns),
        avgLenientSubs: avg(stats.lenientSubs),
        avgLenientDels: avg(stats.lenientDels),
        avgLenientIns: avg(stats.lenientIns),
      };
    });

    return result;
  };

  const modelWiseStats = computeModelWiseStats();

  const tabs = [
    { id: 'single', label: 'Single File' },
    { id: 'batch', label: 'Batch CSV' },
  ];

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/speech-to-text" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="border-b px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md"
                style={{
                  color: colors.text.secondary,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.bg.secondary;
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.text.secondary;
                }}
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
          <TabNavigation
            tabs={tabs}
            activeTab={inputMode}
            onTabChange={(tabId) => setInputMode(tabId as InputMode)}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: colors.bg.secondary }}>
            <div className="max-w-4xl mx-auto space-y-6">

              {/* Upload Section */}
              <div
                className="border rounded-lg p-6"
                style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium" style={{ color: colors.text.primary }}>
                    {inputMode === 'single' ? 'Upload Audio Files' : 'Upload CSV File'}
                  </h2>
                  {inputMode === 'single' && uploadedFiles.length > 0 && (
                    <span className="text-xs" style={{ color: colors.text.secondary }}>
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                    </span>
                  )}
                </div>

                {inputMode === 'single' ? (
                  /* Multiple File Upload Mode */
                  <div className="space-y-4">
                    {/* Audio Dropzone */}
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => document.getElementById('audio-upload')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = colors.accent.primary;
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const files = e.dataTransfer.files;
                        if (files.length > 0) {
                          const input = document.getElementById('audio-upload') as HTMLInputElement;
                          const dt = new DataTransfer();
                          Array.from(files).forEach(f => dt.items.add(f));
                          input.files = dt.files;
                          handleAudioFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                    >
                      <input
                        id="audio-upload"
                        type="file"
                        accept=".mp3,.wav,.m4a,.ogg,.flac,.webm"
                        onChange={handleAudioFileSelect}
                        className="hidden"
                        multiple
                      />
                      <div className="space-y-2">
                        <svg className="w-8 h-8 mx-auto" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <p className="text-sm" style={{ color: colors.text.secondary }}>
                          {uploadedFiles.length > 0 ? 'Add more files' : 'Drag and drop audio files, or click to browse'}
                        </p>
                        <p className="text-xs" style={{ color: colors.text.secondary }}>
                          Supports: MP3, WAV, M4A, OGG, FLAC, WebM
                        </p>
                      </div>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-3">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={file.id}
                            className="border rounded-lg p-4"
                            style={{
                              borderColor: file.groundTruth.trim() ? colors.status.success : colors.border,
                              backgroundColor: file.groundTruth.trim() ? 'rgba(22, 163, 74, 0.02)' : colors.bg.primary,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* File Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                  style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                                >
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate" style={{ color: colors.text.primary }}>
                                    {file.name}
                                  </p>
                                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Audio Player */}
                                <AudioWaveformPlayer
                                  audioBase64={file.base64}
                                  mediaType={file.mediaType}
                                  rowId={index}
                                  fileSize={file.size}
                                  isPlaying={playingFileId === file.id}
                                  onPlayToggle={() => handleFilePlayToggle(file.id)}
                                />
                                {/* Remove Button */}
                                <button
                                  onClick={() => removeFile(file.id)}
                                  className="p-1.5 rounded-md hover:bg-red-50"
                                  style={{ color: colors.text.secondary, transition: 'all 0.15s ease' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#dc2626';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = colors.text.secondary;
                                  }}
                                  title="Remove file"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Ground Truth Input */}
                            <div>
                              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
                                Ground Truth
                              </label>
                              <textarea
                                value={file.groundTruth}
                                onChange={(e) => updateGroundTruth(file.id, e.target.value)}
                                placeholder="Enter the expected transcription..."
                                rows={2}
                                className="w-full px-3 py-2 border rounded-md text-sm"
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

                        {/* Summary Footer */}
                        <div
                          className="flex items-center justify-between px-3 py-2 rounded-md"
                          style={{ backgroundColor: colors.bg.secondary }}
                        >
                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                            Total: {formatFileSize(uploadedFiles.reduce((acc, f) => acc + f.size, 0))}
                          </span>
                          <button
                            onClick={() => setUploadedFiles([])}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ color: '#dc2626', transition: 'all 0.15s ease' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Batch CSV Mode */
                  <div className="space-y-4">
                    {/* CSV Dropzone */}
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                      style={{
                        borderColor: csvFile ? colors.status.success : colors.border,
                        backgroundColor: csvFile ? 'rgba(22, 163, 74, 0.05)' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => document.getElementById('csv-upload')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = colors.accent.primary;
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderColor = csvFile ? colors.status.success : colors.border;
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const input = document.getElementById('csv-upload') as HTMLInputElement;
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          input.files = dt.files;
                          handleCsvFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
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
                        <div className="space-y-2">
                          <div
                            className="w-8 h-8 mx-auto border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }}
                          />
                          <p className="text-sm" style={{ color: colors.text.secondary }}>
                            Parsing CSV and downloading audio files...
                          </p>
                        </div>
                      ) : csvFile ? (
                        <div className="space-y-2">
                          <svg className="w-8 h-8 mx-auto" style={{ color: colors.status.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                            {csvFile.name}
                          </p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            {formatFileSize(csvFile.size)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <svg className="w-8 h-8 mx-auto" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm" style={{ color: colors.text.secondary }}>
                            Drag and drop a CSV file, or click to browse
                          </p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            Required columns: audio_url, ground_truth
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Parsed Rows Preview */}
                    {parsedRows.length > 0 && (
                      <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.border }}>
                        <div
                          className="px-4 py-3 border-b flex items-center justify-between"
                          style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
                        >
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                              Preview ({parsedRows.filter(r => r.status === 'success').length} ready, {parsedRows.filter(r => r.status === 'error').length} failed)
                            </p>
                            {selectedRows.size > 0 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: colors.accent.primary, color: '#fff' }}
                              >
                                {selectedRows.size} selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            Click play to preview audio
                          </p>
                        </div>
                        <div className="max-h-96 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                              <tr style={{ backgroundColor: colors.bg.secondary }}>
                                <th className="px-3 py-2 text-left font-medium w-10" style={{ color: colors.text.primary }}>
                                  {/* Select All Checkbox */}
                                  {(() => {
                                    const successRows = parsedRows.filter(r => r.status === 'success');
                                    const allSelected = successRows.length > 0 && successRows.every(r => selectedRows.has(r.row));
                                    const someSelected = successRows.some(r => selectedRows.has(r.row));
                                    return (
                                      <button
                                        onClick={toggleAllRows}
                                        className="w-4 h-4 border rounded flex items-center justify-center"
                                        style={{
                                          borderColor: allSelected || someSelected ? colors.accent.primary : colors.border,
                                          backgroundColor: allSelected ? colors.accent.primary : 'transparent',
                                          transition: 'all 0.15s ease',
                                        }}
                                        title={allSelected ? 'Deselect all' : 'Select all'}
                                      >
                                        {allSelected && (
                                          <svg className="w-3 h-3" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                        {someSelected && !allSelected && (
                                          <div className="w-2 h-0.5" style={{ backgroundColor: colors.accent.primary }} />
                                        )}
                                      </button>
                                    );
                                  })()}
                                </th>
                                <th className="px-3 py-2 text-left font-medium w-12" style={{ color: colors.text.primary }}>#</th>
                                <th className="px-3 py-2 text-left font-medium w-52" style={{ color: colors.text.primary }}>Audio</th>
                                <th className="px-3 py-2 text-left font-medium" style={{ color: colors.text.primary }}>Ground Truth</th>
                                <th className="px-3 py-2 text-left font-medium w-28" style={{ color: colors.text.primary }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.map((row) => {
                                const isSelected = selectedRows.has(row.row);
                                const isSuccess = row.status === 'success';
                                return (
                                <tr
                                  key={row.row}
                                  className="border-t"
                                  style={{
                                    borderColor: colors.border,
                                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.02)' : playingRowId === row.row ? 'rgba(23, 23, 23, 0.03)' : 'transparent',
                                  }}
                                >
                                  <td className="px-3 py-3">
                                    {/* Individual Row Checkbox */}
                                    <button
                                      onClick={() => isSuccess && toggleRowSelection(row.row)}
                                      className="w-4 h-4 border rounded flex items-center justify-center"
                                      style={{
                                        borderColor: isSelected ? colors.accent.primary : colors.border,
                                        backgroundColor: isSelected ? colors.accent.primary : 'transparent',
                                        opacity: isSuccess ? 1 : 0.4,
                                        cursor: isSuccess ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.15s ease',
                                      }}
                                      disabled={!isSuccess}
                                      title={isSuccess ? (isSelected ? 'Deselect row' : 'Select row') : 'Cannot select failed row'}
                                    >
                                      {isSelected && (
                                        <svg className="w-3 h-3" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-3 py-3" style={{ color: colors.text.secondary }}>{row.row}</td>
                                  <td className="px-3 py-3">
                                    {row.status === 'success' && row.audio_base64 && row.media_type ? (
                                      <AudioWaveformPlayer
                                        audioBase64={row.audio_base64}
                                        mediaType={row.media_type}
                                        rowId={row.row}
                                        fileSize={row.file_size || 0}
                                        isPlaying={playingRowId === row.row}
                                        onPlayToggle={handleAudioPlayToggle}
                                      />
                                    ) : (
                                      <span className="text-xs truncate block max-w-[180px]" style={{ color: colors.text.secondary }}>
                                        {row.audio_url}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className="block text-sm leading-relaxed"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {row.ground_truth}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    {row.status === 'success' ? (
                                      <div className="flex flex-col gap-1">
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit"
                                          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                                        >
                                          Ready
                                        </span>
                                        {row.file_size && (
                                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                                            {formatFileSize(row.file_size)}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-help"
                                        style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                        title={row.error}
                                      >
                                        Error
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                        </div>
                        {/* Summary footer */}
                        <div
                          className="px-4 py-2 border-t flex items-center justify-between"
                          style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
                        >
                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                            {parsedRows.length} total rows
                          </span>
                          <span className="text-xs" style={{ color: colors.text.secondary }}>
                            Total size: {formatFileSize(parsedRows.reduce((acc, r) => acc + (r.file_size || 0), 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div
                className="border rounded-lg p-6"
                style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
              >
                <h2 className="text-sm font-medium mb-4" style={{ color: colors.text.primary }}>
                  Select Transcription Models
                </h2>

                <div className="space-y-4">
                  {Object.entries(MODEL_GROUPS).map(([provider, models]) => {
                    const allSelected = models.every(m => selectedModels.includes(m.id));
                    const someSelected = models.some(m => selectedModels.includes(m.id));

                    return (
                      <div key={provider}>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleProviderModels(provider)}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="w-4 h-4 border rounded flex items-center justify-center"
                              style={{
                                borderColor: allSelected || someSelected ? colors.accent.primary : colors.border,
                                backgroundColor: allSelected ? colors.accent.primary : 'transparent',
                              }}
                            >
                              {allSelected && (
                                <svg className="w-3 h-3" style={{ color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {someSelected && !allSelected && (
                                <div className="w-2 h-0.5" style={{ backgroundColor: colors.accent.primary }} />
                              )}
                            </div>
                            <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                              {provider}
                            </span>
                          </button>
                        </div>

                        <div className="ml-6 grid grid-cols-2 gap-2">
                          {models.map((model) => {
                            const isSelected = selectedModels.includes(model.id);
                            return (
                              <label
                                key={model.id}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-md"
                                style={{
                                  backgroundColor: isSelected ? colors.bg.secondary : 'transparent',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleModel(model.id)}
                                  className="sr-only"
                                />
                                <div
                                  className="w-4 h-4 border rounded flex items-center justify-center flex-shrink-0"
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
                                </div>
                                <span className="text-sm" style={{ color: colors.text.primary }}>
                                  {model.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedModels.length > 0 && (
                  <p className="mt-4 text-xs" style={{ color: colors.text.secondary }}>
                    {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Step 1: Transcribe Button */}
              <div className="flex justify-end">
                <button
                  onClick={runTranscription}
                  disabled={isTranscribing || selectedModels.length === 0}
                  className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: isTranscribing || selectedModels.length === 0 ? colors.border : colors.accent.primary,
                    color: isTranscribing || selectedModels.length === 0 ? colors.text.secondary : '#ffffff',
                    cursor: isTranscribing || selectedModels.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTranscribing && selectedModels.length > 0) {
                      e.currentTarget.style.backgroundColor = colors.accent.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTranscribing && selectedModels.length > 0) {
                      e.currentTarget.style.backgroundColor = colors.accent.primary;
                    }
                  }}
                >
                  {isTranscribing ? (
                    <>
                      <div
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                      />
                      Transcribing ({transcriptionProgress.current}/{transcriptionProgress.total})
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Transcribe
                    </>
                  )}
                </button>
              </div>

              {/* Transcription Preview Section */}
              {transcriptionResults.length > 0 && (
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
                >
                  <div
                    className="px-6 py-4 border-b flex items-center justify-between"
                    style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
                  >
                    <div>
                      <h2 className="text-sm font-medium" style={{ color: colors.text.primary }}>
                        Transcription Results
                      </h2>
                      <p className="text-xs" style={{ color: colors.text.secondary }}>
                        {transcriptionResults.length} audio file{transcriptionResults.length !== 1 ? 's' : ''} transcribed
                      </p>
                    </div>
                    <button
                      onClick={runWerEvaluation}
                      disabled={isEvaluating}
                      className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: isEvaluating ? colors.border : colors.status.success,
                        color: isEvaluating ? colors.text.secondary : '#ffffff',
                        cursor: isEvaluating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isEvaluating ? (
                        <>
                          <div
                            className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                          />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Run WER Evaluation
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: colors.bg.secondary }}>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            #
                          </th>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            Audio
                          </th>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            Ground Truth
                          </th>
                          {selectedModels.map(modelId => {
                            const model = STT_MODELS.find(m => m.id === modelId);
                            return (
                              <th
                                key={modelId}
                                className="px-4 py-3 text-left font-semibold border-b"
                                style={{ color: colors.text.primary, borderColor: colors.border }}
                              >
                                {model?.name || modelId.split(':')[1]}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {transcriptionResults.map((result, idx) => (
                          <tr
                            key={result.file_id}
                            className="border-b"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: idx % 2 === 0 ? colors.bg.primary : colors.bg.secondary,
                            }}
                          >
                            <td className="px-4 py-3" style={{ color: colors.text.secondary }}>
                              {result.row}
                            </td>
                            <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: colors.text.primary }} title={result.audio_url}>
                              {result.audio_url}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]" style={{ color: colors.text.secondary }}>
                              <div className="truncate" title={result.ground_truth}>
                                {result.ground_truth || <span className="italic opacity-50">No ground truth</span>}
                              </div>
                            </td>
                            {selectedModels.map(modelId => {
                              const transcript = result.transcripts[modelId];
                              return (
                                <td key={modelId} className="px-4 py-3 max-w-[250px]">
                                  {transcript?.status === 'success' ? (
                                    <div
                                      className="text-sm leading-relaxed"
                                      style={{ color: colors.text.primary }}
                                      title={transcript.transcript}
                                    >
                                      <div className="line-clamp-3">
                                        {transcript.transcript}
                                      </div>
                                    </div>
                                  ) : transcript?.status === 'error' ? (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded cursor-help"
                                      style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                      title={transcript.error}
                                    >
                                      ERROR
                                    </span>
                                  ) : (
                                    <span className="text-xs opacity-50">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {evaluationResults.length > 0 && (
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}
                >
                  <div
                    className="px-6 py-4 border-b flex items-center justify-between"
                    style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
                  >
                    <div>
                      <h2 className="text-sm font-medium" style={{ color: colors.text.primary }}>
                        WER Evaluation Results
                      </h2>
                      <p className="text-xs" style={{ color: colors.text.secondary }}>
                        {evaluationResults.length} audio file{evaluationResults.length !== 1 ? 's' : ''} evaluated
                      </p>
                    </div>
                    <button
                      onClick={downloadResultsCSV}
                      className="px-3 py-1.5 border rounded-md text-sm font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: colors.border,
                        color: colors.text.primary,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bg.secondary;
                        e.currentTarget.style.borderColor = '#d4d4d4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: colors.bg.secondary }}>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            #
                          </th>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            Audio
                          </th>
                          <th className="px-4 py-3 text-left font-semibold border-b" style={{ color: colors.text.primary, borderColor: colors.border }}>
                            Ground Truth
                          </th>
                          {selectedModels.map(modelId => {
                            const model = STT_MODELS.find(m => m.id === modelId);
                            return (
                              <th
                                key={modelId}
                                className="px-4 py-3 text-center font-semibold border-b"
                                style={{ color: colors.text.primary, borderColor: colors.border }}
                              >
                                {model?.name || modelId.split(':')[1]}
                                <span className="block text-xs font-normal" style={{ color: colors.text.secondary }}>
                                  Strict / Lenient WER
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationResults.map((result, idx) => (
                          <tr
                            key={result.row}
                            className="border-b cursor-pointer"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: idx % 2 === 0 ? colors.bg.primary : colors.bg.secondary,
                              transition: 'background-color 0.15s ease',
                            }}
                            onClick={() => {
                              setSelectedResultRow(result);
                              setIsModalOpen(true);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f0f0f0';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = idx % 2 === 0 ? colors.bg.primary : colors.bg.secondary;
                            }}
                          >
                            <td className="px-4 py-3" style={{ color: colors.text.secondary }}>
                              {result.row}
                            </td>
                            <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: colors.text.primary }} title={result.audio_url}>
                              {result.audio_url}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]" style={{ color: colors.text.secondary }}>
                              <div className="truncate" title={result.ground_truth}>
                                {result.ground_truth || <span className="italic opacity-50">No ground truth</span>}
                              </div>
                            </td>
                            {selectedModels.map(modelId => {
                              const transcription = result.transcriptions[modelId];
                              return (
                                <td key={modelId} className="px-4 py-3 text-center">
                                  {transcription?.status === 'success' && transcription.strict && transcription.lenient ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="text-sm font-medium"
                                          style={{ color: getWerColor(transcription.strict.wer * 100) }}
                                          title={`Substitutions: ${transcription.strict.substitutions}, Deletions: ${transcription.strict.deletions}, Insertions: ${transcription.strict.insertions}`}
                                        >
                                          {(transcription.strict.wer * 100).toFixed(1)}%
                                        </span>
                                        <span style={{ color: colors.text.secondary }}>/</span>
                                        <span
                                          className="text-sm font-medium"
                                          style={{ color: getWerColor(transcription.lenient.wer * 100) }}
                                          title={`Substitutions: ${transcription.lenient.substitutions}, Deletions: ${transcription.lenient.deletions}, Insertions: ${transcription.lenient.insertions}`}
                                        >
                                          {(transcription.lenient.wer * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="text-xs max-w-[200px] truncate" style={{ color: colors.text.secondary }} title={transcription.text}>
                                        {transcription.text}
                                      </div>
                                    </div>
                                  ) : transcription?.status === 'error' ? (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded cursor-help"
                                      style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                      title={transcription.error}
                                    >
                                      ERROR
                                    </span>
                                  ) : (
                                    <span className="text-xs opacity-50">N/A</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Model-wise Summary Stats - Collapsible */}
                  {Object.keys(modelWiseStats).length > 0 && (
                    <div
                      className="border-t"
                      style={{ borderColor: colors.border }}
                    >
                      {/* Dropdown Header */}
                      <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="w-full px-6 py-3 flex items-center justify-between"
                        style={{ backgroundColor: colors.bg.secondary }}
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 transition-transform"
                            style={{
                              color: colors.text.secondary,
                              transform: isSummaryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                            Model-wise Summary Statistics
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: colors.bg.primary, color: colors.text.secondary }}
                          >
                            {Object.keys(modelWiseStats).length} model{Object.keys(modelWiseStats).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: colors.text.secondary }}>
                          {isSummaryOpen ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </button>

                      {/* Collapsible Content */}
                      {isSummaryOpen && (
                        <div
                          className="px-6 py-4"
                          style={{ backgroundColor: colors.bg.secondary }}
                        >
                          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(modelWiseStats).length, 3)}, 1fr)` }}>
                            {Object.entries(modelWiseStats).map(([modelKey, stats]) => (
                              <div
                                key={modelKey}
                                className="rounded-lg border p-4"
                                style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}
                              >
                                {/* Model Header */}
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: colors.border }}>
                                  <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                    {stats.modelName}
                                  </span>
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: '#e5e5e5', color: colors.text.secondary }}
                                  >
                                    {stats.provider}
                                  </span>
                                  <span className="text-xs ml-auto" style={{ color: colors.text.secondary }}>
                                    {stats.count} samples
                                  </span>
                                </div>

                                {/* WER Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  {/* Strict */}
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>Strict WER</p>
                                    <p className="text-xl font-bold" style={{ color: getWerColor(stats.avgStrictWer * 100) }}>
                                      {(stats.avgStrictWer * 100).toFixed(2)}%
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                      <span className="text-xs" style={{ color: colors.text.secondary }}>
                                        Min: <span style={{ color: getWerColor(stats.minStrictWer * 100) }}>{(stats.minStrictWer * 100).toFixed(1)}%</span>
                                      </span>
                                      <span className="text-xs" style={{ color: colors.text.secondary }}>
                                        Max: <span style={{ color: getWerColor(stats.maxStrictWer * 100) }}>{(stats.maxStrictWer * 100).toFixed(1)}%</span>
                                      </span>
                                    </div>
                                  </div>
                                  {/* Lenient */}
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>Lenient WER</p>
                                    <p className="text-xl font-bold" style={{ color: getWerColor(stats.avgLenientWer * 100) }}>
                                      {(stats.avgLenientWer * 100).toFixed(2)}%
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                      <span className="text-xs" style={{ color: colors.text.secondary }}>
                                        Min: <span style={{ color: getWerColor(stats.minLenientWer * 100) }}>{(stats.minLenientWer * 100).toFixed(1)}%</span>
                                      </span>
                                      <span className="text-xs" style={{ color: colors.text.secondary }}>
                                        Max: <span style={{ color: getWerColor(stats.maxLenientWer * 100) }}>{(stats.maxLenientWer * 100).toFixed(1)}%</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Error Breakdown */}
                                <div className="pt-2 border-t" style={{ borderColor: colors.border }}>
                                  <p className="text-xs mb-2" style={{ color: colors.text.secondary }}>Avg Errors (Strict / Lenient)</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Subs</p>
                                      <p className="text-sm font-medium" style={{ color: colors.status.warning }}>
                                        {stats.avgStrictSubs.toFixed(1)} / {stats.avgLenientSubs.toFixed(1)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Del</p>
                                      <p className="text-sm font-medium" style={{ color: colors.status.error }}>
                                        {stats.avgStrictDels.toFixed(1)} / {stats.avgLenientDels.toFixed(1)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Ins</p>
                                      <p className="text-sm font-medium" style={{ color: colors.accent.primary }}>
                                        {stats.avgStrictIns.toFixed(1)} / {stats.avgLenientIns.toFixed(1)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down Modal */}
      {isModalOpen && selectedResultRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: colors.bg.primary }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
              style={{ borderColor: colors.border }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  Row {selectedResultRow.row} - WER Details
                </h2>
                <p className="text-sm truncate max-w-[500px]" style={{ color: colors.text.secondary }}>
                  {selectedResultRow.audio_url}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-md hover:bg-opacity-80"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* Ground Truth */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2" style={{ color: colors.text.secondary }}>
                  Ground Truth
                </h3>
                <p
                  className="text-sm p-3 rounded-md"
                  style={{ backgroundColor: colors.bg.secondary, color: colors.text.primary }}
                >
                  {selectedResultRow.ground_truth || <span className="italic opacity-50">No ground truth</span>}
                </p>
              </div>

              {/* Model Results */}
              <div className="space-y-4">
                {Object.entries(selectedResultRow.transcriptions).map(([modelKey, transcription]) => {
                  const modelConfig = STT_MODELS.find(m => m.id === modelKey);
                  const modelName = modelConfig?.name || modelKey.split(':')[1];
                  const providerName = modelConfig?.provider || modelKey.split(':')[0];

                  return (
                    <div
                      key={modelKey}
                      className="rounded-lg border"
                      style={{ borderColor: colors.border }}
                    >
                      {/* Model Header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between border-b"
                        style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
                            {modelName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#e5e5e5', color: colors.text.secondary }}
                          >
                            {providerName}
                          </span>
                        </div>
                        {transcription.status === 'success' && transcription.strict && transcription.lenient && (
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs" style={{ color: colors.text.secondary }}>Strict WER</span>
                              <p
                                className="text-lg font-semibold"
                                style={{ color: getWerColor(transcription.strict.wer * 100) }}
                              >
                                {(transcription.strict.wer * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs" style={{ color: colors.text.secondary }}>Lenient WER</span>
                              <p
                                className="text-lg font-semibold"
                                style={{ color: getWerColor(transcription.lenient.wer * 100) }}
                              >
                                {(transcription.lenient.wer * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Transcription Text & Metrics */}
                      <div className="p-4">
                        {transcription.status === 'error' ? (
                          <div
                            className="text-sm px-3 py-2 rounded"
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                          >
                            Error: {transcription.error || 'Unknown error'}
                          </div>
                        ) : (
                          <>
                            {/* Transcription Text */}
                            <div className="mb-4">
                              <span className="text-xs" style={{ color: colors.text.secondary }}>Transcription</span>
                              <p className="text-sm mt-1" style={{ color: colors.text.primary }}>
                                {transcription.text}
                              </p>
                            </div>

                            {/* Error Metrics Grid */}
                            {transcription.strict && transcription.lenient && (
                              <div className="grid grid-cols-2 gap-4">
                                {/* Strict Metrics */}
                                <div
                                  className="rounded-md p-3"
                                  style={{ backgroundColor: colors.bg.secondary }}
                                >
                                  <p className="text-xs font-medium mb-3" style={{ color: colors.text.secondary }}>
                                    Strict Mode Errors
                                  </p>
                                  <div className="grid grid-cols-4 gap-3">
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Substitutions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.status.warning }}>
                                        {transcription.strict.substitutions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Deletions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.status.error }}>
                                        {transcription.strict.deletions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Insertions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.accent.primary }}>
                                        {transcription.strict.insertions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Semantic</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                                        {transcription.strict.semantic_errors}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t flex gap-4" style={{ borderColor: colors.border }}>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Reference Words</p>
                                      <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                        {transcription.strict.reference_word_count}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Hypothesis Words</p>
                                      <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                        {transcription.strict.hypothesis_word_count}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Lenient Metrics */}
                                <div
                                  className="rounded-md p-3"
                                  style={{ backgroundColor: colors.bg.secondary }}
                                >
                                  <p className="text-xs font-medium mb-3" style={{ color: colors.text.secondary }}>
                                    Lenient Mode Errors
                                  </p>
                                  <div className="grid grid-cols-4 gap-3">
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Substitutions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.status.warning }}>
                                        {transcription.lenient.substitutions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Deletions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.status.error }}>
                                        {transcription.lenient.deletions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Insertions</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.accent.primary }}>
                                        {transcription.lenient.insertions}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Semantic</p>
                                      <p className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                                        {transcription.lenient.semantic_errors}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t flex gap-4" style={{ borderColor: colors.border }}>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Reference Words</p>
                                      <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                        {transcription.lenient.reference_word_count}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs" style={{ color: colors.text.secondary }}>Hypothesis Words</p>
                                      <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                                        {transcription.lenient.hypothesis_word_count}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
