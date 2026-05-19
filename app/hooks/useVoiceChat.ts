"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  arrayBufferToBase64,
  audioBufferToMono16k,
  encodeWav,
} from "@/app/lib/audio/codec";

export type VoiceStatus = "idle" | "listening" | "sending" | "error";

interface UseVoiceChatArgs {
  onSubmitAudio: (audio: {
    base64: string;
    mimeType: string;
    transcript: string;
  }) => Promise<string | null | undefined>;
}

interface UseVoiceChatResult {
  status: VoiceStatus;
  error: string | null;
  audioLevel: number; // 0..1 — for the live waveform
  transcript: string; // live transcript captured during recording
  start: () => Promise<void>;
  submit: () => Promise<void>;
  cancel: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}
interface SpeechRecognitionLike {
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
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

/**
 * AudioWorkletProcessor source — captures the first input channel each
 * render quantum and ships a Float32 copy to the main thread via the
 * worklet port. Inlined as a string so we don't need a separate static
 * file (Next.js would otherwise need to serve it from /public).
 */
const PCM_RECORDER_WORKLET = `
class PCMRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channel = input[0];
      if (channel && channel.length > 0) {
        // Copy: the underlying memory is reused by the audio thread.
        this.port.postMessage(new Float32Array(channel));
      }
    }
    return true;
  }
}
registerProcessor("pcm-recorder", PCMRecorderProcessor);
`;

// AudioWorklet modules are loaded per-AudioContext, so cache the load
// promise on the context itself. A new context = a new addModule() call.
const pcmRecorderModuleByCtx = new WeakMap<AudioContext, Promise<void>>();

function ensurePcmRecorderModule(ctx: AudioContext): Promise<void> {
  let promise = pcmRecorderModuleByCtx.get(ctx);
  if (!promise) {
    const blob = new Blob([PCM_RECORDER_WORKLET], {
      type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);
    promise = ctx.audioWorklet
      .addModule(url)
      .finally(() => URL.revokeObjectURL(url));
    pcmRecorderModuleByCtx.set(ctx, promise);
  }
  return promise;
}

/**
 * Owns the microphone capture + speech synthesis loop for voice chat.
 * Lifecycle:
 *   idle ──start()──▶ listening ──submit()──▶ sending ──response──▶ idle
 * cancel() at any point returns to idle and tears down resources.
 */
export function useVoiceChat({
  onSubmitAudio,
}: UseVoiceChatArgs): UseVoiceChatResult {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleRateRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const transcriptRef = useRef("");
  const recognitionDisabledRef = useRef(false);
  const recognitionLoggedRef = useRef(false);

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const stopRecognition = useCallback((options?: { abort?: boolean }) => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onend = null;
    rec.onerror = null;
    try {
      if (options?.abort) rec.abort();
      else rec.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (recognitionDisabledRef.current) return; // permanently disabled this session
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;
    if (!Ctor) return; // graceful: no browser STT, transcript stays empty

    finalTranscriptRef.current = "";
    transcriptRef.current = "";
    setTranscript("");

    let rec: SpeechRecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      return;
    }
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript;
        if (res.isFinal) {
          finalTranscriptRef.current = (
            finalTranscriptRef.current +
            " " +
            text
          ).trim();
        } else {
          interim += text;
        }
      }
      const combined = `${finalTranscriptRef.current} ${interim}`.trim() || "";
      transcriptRef.current = combined;
      setTranscript(combined);
    };
    rec.onerror = (e) => {
      const errCode = (e as { error?: string }).error;
      // Permanent failures: don't retry. Audio recorder still owns the
      // request path — the chat bubble will fall back to a placeholder.
      const fatal =
        errCode === "network" ||
        errCode === "service-not-allowed" ||
        errCode === "not-allowed" ||
        errCode === "audio-capture" ||
        errCode === "language-not-supported";
      if (fatal) {
        recognitionDisabledRef.current = true;
        if (!recognitionLoggedRef.current) {
          recognitionLoggedRef.current = true;
          console.warn(
            `Browser SpeechRecognition disabled (${errCode}). Voice messages will still be sent as audio.`,
          );
        }
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          // ignore
        }
        if (recognitionRef.current === rec) recognitionRef.current = null;
      }
    };
    rec.onend = () => {
      // If we're still listening and the recognizer ended early, restart it.
      if (
        recognitionRef.current === rec &&
        !cancelledRef.current &&
        !recognitionDisabledRef.current
      ) {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const teardownRecording = useCallback(() => {
    stopMeter();
    stopRecognition({ abort: true });
    try {
      recorderNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
    } catch {
      // ignore
    }
    recorderNodeRef.current = null;
    sourceNodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    pcmChunksRef.current = [];
    pcmSampleRateRef.current = 0;
  }, [stopMeter, stopRecognition]);

  const startMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setAudioLevel(Math.min(1, rms * 2.5));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startRecording = useCallback(async () => {
    cancelledRef.current = false;
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Microphone access is not available in this browser.");
      setStatus("error");
      return;
    }

    // Reset transcript. Browser SpeechRecognition is started as a
    // best-effort live preview where it's supported; server-side STT (to be
    // wired up later) is the authoritative transcript path.
    transcriptRef.current = "";
    setTranscript("");
    startRecognition();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      stopRecognition({ abort: true });
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone permission denied."
          : "Couldn't access the microphone.",
      );
      setStatus("error");
      return;
    }

    if (cancelledRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;
    pcmChunksRef.current = [];

    // Capture raw PCM directly via Web Audio API instead of MediaRecorder.
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      pcmSampleRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Visualizer feed.
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Recorder feed — AudioWorkletNode runs a tiny processor on the
      // audio thread, posts Float32 sample chunks back to the main thread
      // via its MessagePort.
      await ensurePcmRecorderModule(ctx);
      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        ctx.close().catch(() => {});
        audioCtxRef.current = null;
        return;
      }

      const worklet = new AudioWorkletNode(ctx, "pcm-recorder", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      recorderNodeRef.current = worklet;
      worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
        pcmChunksRef.current.push(e.data);
      };
      source.connect(worklet);
      // Worklets only schedule renders when connected to a destination.
      worklet.connect(ctx.destination);

      startMeter();
    } catch (e) {
      console.error("Failed to set up audio capture:", e);
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setError("Couldn't set up the audio recorder.");
      setStatus("error");
      return;
    }

    setStatus("listening");
  }, [startMeter, startRecognition, stopRecognition]);

  /**
   * Stops PCM capture and returns the concatenated mono Float32 samples
   * plus the source sample rate. Returns null if nothing was captured.
   */
  const stopRecording = useCallback((): {
    samples: Float32Array;
    sampleRate: number;
  } | null => {
    try {
      recorderNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
    } catch {
      // ignore
    }
    recorderNodeRef.current = null;
    sourceNodeRef.current = null;

    const chunks = pcmChunksRef.current;
    const sampleRate = pcmSampleRateRef.current;
    pcmChunksRef.current = [];
    if (chunks.length === 0 || !sampleRate) return null;

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const samples = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      samples.set(c, offset);
      offset += c.length;
    }
    return { samples, sampleRate };
  }, []);

  const submit = useCallback(async () => {
    if (status !== "listening") return;
    setStatus("sending");
    stopMeter();
    stopRecognition();

    const pcm = stopRecording();
    const stream = streamRef.current;
    stream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;

    if (!pcm || pcm.samples.length === 0) {
      setError("No audio captured. Try again.");
      setStatus("error");
      return;
    }

    try {
      /**
       * Convert captured PCM samples into an AudioBuffer and encode as WAV.
       * Resample to 16 kHz mono since most STT pipelines expect this format
       * and some players/backends fail with higher sample rates.
       */
      const sourceBuffer = new AudioBuffer({
        length: pcm.samples.length,
        sampleRate: pcm.sampleRate,
        numberOfChannels: 1,
      });
      sourceBuffer.getChannelData(0).set(pcm.samples);
      const samples16k = audioBufferToMono16k(sourceBuffer);
      const audioBuffer = new AudioBuffer({
        length: samples16k.length,
        sampleRate: 16000,
        numberOfChannels: 1,
      });
      audioBuffer.getChannelData(0).set(samples16k);
      const wavBlob = encodeWav(audioBuffer);
      const base64 = arrayBufferToBase64(await wavBlob.arrayBuffer());
      const liveTranscript = (
        transcriptRef.current || finalTranscriptRef.current
      ).trim();
      const reply = await onSubmitAudio({
        base64,
        mimeType: "audio/wav",
        transcript: liveTranscript,
      });
      // Auto-read / auto-re-listen has been removed for now. After the
      // reply lands we drop back to idle and let the user decide whether
      // to play the reply (via the speaker button in the chat bubble) and
      // whether to record again.
      setStatus("idle");
      // Silence the unused-binding lint if `reply` is unused now.
      void reply;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice request failed.");
      setStatus("error");
    }
  }, [onSubmitAudio, status, stopMeter, stopRecognition, stopRecording]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    teardownRecording();
    setStatus("idle");
    setError(null);
  }, [teardownRecording]);

  const start = useCallback(async () => {
    cancelledRef.current = false;
    await startRecording();
  }, [startRecording]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      teardownRecording();
    };
  }, [teardownRecording]);

  return {
    status,
    error,
    audioLevel,
    transcript,
    start,
    submit,
    cancel,
  };
}
