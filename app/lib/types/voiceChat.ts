export type VoiceStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "sending"
  | "error";

export interface UseVoiceChatArgs {
  onSubmitAudio: (audio: {
    base64: string;
    mimeType: string;
    transcript: string;
  }) => Promise<string | null | undefined>;
}

export interface UseVoiceChatResult {
  status: VoiceStatus;
  error: string | null;
  audioLevel: number; // 0..1 — for the live waveform
  transcript: string; // live transcript captured during recording
  start: () => Promise<void>;
  submit: () => Promise<void>;
  cancel: () => void;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}
