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

interface TranscriptionResult {
  model: string;
  text: string;
  wer: number;
  status: 'success' | 'error';
  error?: string;
}

interface EvaluationResult {
  row: number;
  audio_url: string;
  ground_truth: string;
  transcriptions: Record<string, TranscriptionResult>;
}

type InputMode = 'single' | 'batch';

// Available STT Models
const STT_MODELS: ModelConfig[] = [
  // Google
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'chirp-3', name: 'Chirp 3', provider: 'Google' },
  // OpenAI
  { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe', provider: 'OpenAI' },
  { id: 'whisper-1', name: 'Whisper-1', provider: 'OpenAI' },
  // AI4Bharat
  { id: 'ai4bharat/indic-conformer-600m-multilingual', name: 'Indic Conformer 600M', provider: 'AI4Bharat' },
];

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

  // Single file mode state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMediaType, setAudioMediaType] = useState<string | null>(null);
  const [isSinglePlaying, setIsSinglePlaying] = useState(false);
  const [groundTruth, setGroundTruth] = useState('');

  // Batch mode state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [playingRowId, setPlayingRowId] = useState<number | null>(null);

  // Model selection
  const [selectedModels, setSelectedModels] = useState<string[]>(['whisper-1']);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState({ current: 0, total: 0 });

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

  // Handle audio file selection (single mode)
  const handleAudioFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];
    const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValid) {
      toast.error('Please select a valid audio file (mp3, wav, m4a, ogg, flac, webm)');
      event.target.value = '';
      return;
    }

    setAudioFile(file);
    setIsSinglePlaying(false);

    // Convert file to base64 for preview
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64
      const base64 = result.split(',')[1];
      setAudioBase64(base64);
      setAudioMediaType(file.type || 'audio/mpeg');
      console.log('[STT Page] Single file loaded:', file.name, 'type:', file.type, 'size:', file.size);
    };
    reader.onerror = () => {
      console.error('[STT Page] Failed to read audio file');
      toast.error('Failed to read audio file');
    };
    reader.readAsDataURL(file);
  };

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

    // Parse CSV
    await parseCSV(file);
  };

  // Handle audio play toggle - only one audio can play at a time
  const handleAudioPlayToggle = useCallback((rowId: number) => {
    console.log('[STT Page] Audio play toggle for row:', rowId);
    setPlayingRowId(prev => prev === rowId ? null : rowId);
    // Stop single file audio if batch audio starts playing
    setIsSinglePlaying(false);
  }, []);

  // Handle single file audio play toggle
  const handleSingleAudioPlayToggle = useCallback((_rowId: number) => {
    setIsSinglePlaying(prev => !prev);
    // Stop batch audio if single file audio starts playing
    setPlayingRowId(null);
  }, []);

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

  // Run evaluation
  const runEvaluation = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model');
      return;
    }

    if (inputMode === 'single') {
      if (!audioFile) {
        toast.error('Please upload an audio file');
        return;
      }
      if (!groundTruth.trim()) {
        toast.error('Please enter the ground truth text');
        return;
      }
    } else {
      const validRows = parsedRows.filter(r => r.status === 'success');
      if (validRows.length === 0) {
        toast.error('No valid audio files to evaluate');
        return;
      }
    }

    if (apiKeys.length === 0) {
      toast.error('Please add an API key in Keystore first');
      return;
    }

    setIsEvaluating(true);
    setEvaluationResults([]);

    try {
      // TODO: Implement actual API call
      // For now, simulate evaluation with mock data
      const itemsToEvaluate = inputMode === 'single'
        ? [{ audio_url: audioFile?.name || '', ground_truth: groundTruth }]
        : parsedRows.filter(r => r.status === 'success');

      setEvaluationProgress({ current: 0, total: itemsToEvaluate.length });

      // Simulated results (replace with actual API call)
      const mockResults: EvaluationResult[] = itemsToEvaluate.map((item: { audio_url?: string; ground_truth?: string }, idx: number) => {
        const transcriptions: Record<string, TranscriptionResult> = {};
        selectedModels.forEach(modelId => {
          transcriptions[modelId] = {
            model: modelId,
            text: 'Simulated transcription result',
            wer: Math.random() * 15, // Random WER between 0-15%
            status: 'success',
          };
        });

        return {
          row: idx + 1,
          audio_url: 'audio_url' in item ? item.audio_url : (audioFile?.name || ''),
          ground_truth: 'ground_truth' in item ? item.ground_truth : groundTruth,
          transcriptions,
        };
      });

      // Simulate progress
      for (let i = 0; i < mockResults.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setEvaluationProgress({ current: i + 1, total: itemsToEvaluate.length });
      }

      setEvaluationResults(mockResults);
      toast.success('Evaluation completed');
    } catch (error) {
      console.error('Evaluation error:', error);
      toast.error('Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Download results as CSV
  const downloadResultsCSV = () => {
    if (evaluationResults.length === 0) return;

    const headers = ['Row', 'Audio URL', 'Ground Truth', ...selectedModels.map(m => `${m}_WER`), ...selectedModels.map(m => `${m}_Text`)];
    const rows = evaluationResults.map(result => {
      const werValues = selectedModels.map(m => result.transcriptions[m]?.wer?.toFixed(2) || 'ERROR');
      const textValues = selectedModels.map(m => `"${result.transcriptions[m]?.text || 'ERROR'}"`);
      return [result.row, result.audio_url, `"${result.ground_truth}"`, ...werValues, ...textValues].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stt-evaluation-results-${Date.now()}.csv`;
    a.click();
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
                <h2 className="text-sm font-medium mb-4" style={{ color: colors.text.primary }}>
                  {inputMode === 'single' ? 'Upload Audio File' : 'Upload CSV File'}
                </h2>

                {inputMode === 'single' ? (
                  /* Single File Mode */
                  <div className="space-y-4">
                    {/* Audio Dropzone */}
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                      style={{
                        borderColor: audioFile ? colors.status.success : colors.border,
                        backgroundColor: audioFile ? 'rgba(22, 163, 74, 0.05)' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => document.getElementById('audio-upload')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = colors.accent.primary;
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderColor = audioFile ? colors.status.success : colors.border;
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const input = document.getElementById('audio-upload') as HTMLInputElement;
                          const dt = new DataTransfer();
                          dt.items.add(file);
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
                      />
                      {audioFile ? (
                        <div className="space-y-3">
                          <svg className="w-8 h-8 mx-auto" style={{ color: colors.status.success }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                            {audioFile.name}
                          </p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            {formatFileSize(audioFile.size)}
                          </p>
                          {/* Audio Preview Player */}
                          {audioBase64 && audioMediaType && (
                            <div
                              className="flex justify-center pt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AudioWaveformPlayer
                                audioBase64={audioBase64}
                                mediaType={audioMediaType}
                                rowId={-1}
                                fileSize={audioFile.size}
                                isPlaying={isSinglePlaying}
                                onPlayToggle={handleSingleAudioPlayToggle}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <svg className="w-8 h-8 mx-auto" style={{ color: colors.text.secondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <p className="text-sm" style={{ color: colors.text.secondary }}>
                            Drag and drop an audio file, or click to browse
                          </p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            Supports: MP3, WAV, M4A, OGG, FLAC, WebM
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Ground Truth Input */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.text.primary }}>
                        Ground Truth Text
                      </label>
                      <textarea
                        value={groundTruth}
                        onChange={(e) => setGroundTruth(e.target.value)}
                        placeholder="Enter the expected transcription..."
                        rows={4}
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
                          <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
                            Preview ({parsedRows.filter(r => r.status === 'success').length} ready, {parsedRows.filter(r => r.status === 'error').length} failed)
                          </p>
                          <p className="text-xs" style={{ color: colors.text.secondary }}>
                            Click play to preview audio
                          </p>
                        </div>
                        <div className="max-h-96 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0">
                              <tr style={{ backgroundColor: colors.bg.secondary }}>
                                <th className="px-3 py-2 text-left font-medium w-12" style={{ color: colors.text.primary }}>#</th>
                                <th className="px-3 py-2 text-left font-medium w-48" style={{ color: colors.text.primary }}>Audio</th>
                                <th className="px-3 py-2 text-left font-medium" style={{ color: colors.text.primary }}>Ground Truth</th>
                                <th className="px-3 py-2 text-left font-medium w-20" style={{ color: colors.text.primary }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.map((row) => (
                                <tr
                                  key={row.row}
                                  className="border-t"
                                  style={{
                                    borderColor: colors.border,
                                    backgroundColor: playingRowId === row.row ? 'rgba(23, 23, 23, 0.03)' : 'transparent',
                                  }}
                                >
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
                                      className="block truncate max-w-md"
                                      style={{ color: colors.text.primary }}
                                      title={row.ground_truth}
                                    >
                                      {row.ground_truth}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    {row.status === 'success' ? (
                                      <div className="flex items-center gap-1">
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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
                              ))}
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

              {/* Run Button */}
              <div className="flex justify-end">
                <button
                  onClick={runEvaluation}
                  disabled={isEvaluating || selectedModels.length === 0}
                  className="px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: isEvaluating || selectedModels.length === 0 ? colors.border : colors.accent.primary,
                    color: isEvaluating || selectedModels.length === 0 ? colors.text.secondary : '#ffffff',
                    cursor: isEvaluating || selectedModels.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isEvaluating && selectedModels.length > 0) {
                      e.currentTarget.style.backgroundColor = colors.accent.hover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isEvaluating && selectedModels.length > 0) {
                      e.currentTarget.style.backgroundColor = colors.accent.primary;
                    }
                  }}
                >
                  {isEvaluating ? (
                    <>
                      <div
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                      />
                      Evaluating ({evaluationProgress.current}/{evaluationProgress.total})
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
                        Evaluation Results
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
                                {model?.name || modelId}
                                <span className="block text-xs font-normal" style={{ color: colors.text.secondary }}>
                                  WER %
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
                            className="border-b"
                            style={{
                              borderColor: colors.border,
                              backgroundColor: idx % 2 === 0 ? colors.bg.primary : colors.bg.secondary,
                            }}
                          >
                            <td className="px-4 py-3 max-w-xs truncate" style={{ color: colors.text.primary }}>
                              {result.audio_url}
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate" style={{ color: colors.text.secondary }}>
                              {result.ground_truth}
                            </td>
                            {selectedModels.map(modelId => {
                              const transcription = result.transcriptions[modelId];
                              return (
                                <td key={modelId} className="px-4 py-3">
                                  {transcription?.status === 'success' ? (
                                    <span
                                      className="font-medium"
                                      style={{ color: getWerColor(transcription.wer) }}
                                    >
                                      {transcription.wer.toFixed(2)}%
                                    </span>
                                  ) : (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded"
                                      style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                    >
                                      ERROR
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div
                    className="px-6 py-4 border-t"
                    style={{ backgroundColor: colors.bg.secondary, borderColor: colors.border }}
                  >
                    <div className="flex gap-6">
                      {selectedModels.map(modelId => {
                        const model = STT_MODELS.find(m => m.id === modelId);
                        const wers = evaluationResults
                          .map(r => r.transcriptions[modelId])
                          .filter(t => t?.status === 'success')
                          .map(t => t.wer);

                        if (wers.length === 0) return null;

                        const avgWer = wers.reduce((a, b) => a + b, 0) / wers.length;

                        return (
                          <div key={modelId}>
                            <p className="text-xs" style={{ color: colors.text.secondary }}>
                              {model?.name || modelId} Avg
                            </p>
                            <p className="text-lg font-semibold" style={{ color: getWerColor(avgWer) }}>
                              {avgWer.toFixed(2)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
